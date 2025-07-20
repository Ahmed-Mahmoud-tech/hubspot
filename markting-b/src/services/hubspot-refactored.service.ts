import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Action, ActionStatus } from '../entities/action.entity';
import { User } from '../entities/user.entity';
import { Merging } from '../entities/merging.entity';
import { Modified } from '../entities/modified.entity';
import { Remove } from '../entities/remove.entity';
import { MergingService } from './merging.service';
import { RemovalService } from './removal.service';
import { HubSpotApiService } from './hubspot-api.service';
import { ContactService } from './contact.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { ProgressService, ProcessProgress } from './progress.service';
import { FileGenerationService } from './file-generation.service';
import { MatchingService } from './matching.service';
import {
  StartHubSpotFetchDto,
  GetDuplicatesDto,
  SubmitMergeDto,
  FinishProcessDto,
  RemoveContactDto,
  MergeContactsDto,
  BatchMergeContactsDto,
  ResetMergeByGroupDto,
} from '../dto/hubspot.dto';
import axios from 'axios';

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);

  constructor(
    @InjectRepository(Action)
    private actionRepository: Repository<Action>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Merging)
    private mergingRepository: Repository<Merging>,
    @InjectRepository(Modified)
    private modifiedRepository: Repository<Modified>,
    @InjectRepository(Remove)
    private removeRepository: Repository<Remove>,
    private mergingService: MergingService,
    private removalService: RemovalService,
    private hubspotApiService: HubSpotApiService,
    private contactService: ContactService,
    private duplicateDetectionService: DuplicateDetectionService,
    private progressService: ProgressService,
    private fileGenerationService: FileGenerationService,
    private matchingService: MatchingService,
  ) {}

  getProcessProgress(userId: number, apiKey: string): ProcessProgress {
    return this.progressService.getProcessProgress(userId, apiKey);
  }

  async startFetch(
    userId: number,
    startHubSpotFetchDto: StartHubSpotFetchDto,
  ): Promise<{ message: string; action: Action }> {
    try {
      const { name, apiKey } = startHubSpotFetchDto;
      this.logger.log(
        `Starting fetch for user ${userId} with API key ${apiKey.substring(0, 10)}...`,
      );

      // Check if there are existing contacts for this API key that are not finished processing
      const existingAction = await this.actionRepository.findOne({
        where: {
          user_id: userId,
          api_key: apiKey,
          status: In([
            ActionStatus.START,
            ActionStatus.FETCHING,
            ActionStatus.MANUALLY_MERGE,
            ActionStatus.UPDATE_HUBSPOT,
          ]),
        },
        order: { created_at: 'DESC' },
      });

      if (existingAction) {
        this.logger.warn(
          `Existing action found for user ${userId} with API key ${apiKey.substring(0, 10)}...`,
        );
        throw new BadRequestException(
          'This process is not finished yet. Contacts with this API key already exist. Please wait for the current process to complete or remove the existing data.',
        );
      }

      // Check if there are existing contacts in the database for this API key
      const existingContacts = await this.contactService.getContactCount(
        userId,
        apiKey,
      );

      if (existingContacts > 0) {
        this.logger.warn(
          `Found ${existingContacts} existing contacts for user ${userId} with API key ${apiKey.substring(0, 10)}...`,
        );
        throw new BadRequestException(
          'Contacts with this API key already exist. Please remove the existing data before starting a new fetch.',
        );
      }

      // Validate API key by making a test request to HubSpot
      try {
        await this.hubspotApiService.validateApiKey(apiKey);
        this.logger.log('API key validation successful');
      } catch (error) {
        this.logger.error('API key validation failed:', error.message);
        throw new BadRequestException(
          'Invalid API key or HubSpot API error. Please check your HubSpot API key and try again.',
        );
      }

      // Create initial action record
      const action = this.actionRepository.create({
        name,
        api_key: apiKey,
        count: 0,
        status: ActionStatus.START,
        process_name: 'fetching',
        user_id: userId,
      });

      const savedAction = await this.actionRepository.save(action);

      // Start the background fetch process
      this.fetchAllContacts(savedAction.id, apiKey, userId).catch((error) => {
        this.logger.error(
          `Failed to fetch contacts for action ${savedAction.id}:`,
          error,
        );
        void this.updateActionStatus(savedAction.id, ActionStatus.ERROR, 0);
      });

      return {
        message:
          'HubSpot data fetching started successfully. This process will run in the background.',
        action: savedAction,
      };
    } catch (error) {
      this.logger.error('Error in startFetch method:', error);
      // Re-throw BadRequestException as-is, but wrap other errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to start fetch: ${error.message}`);
    }
  }

  private async fetchAllContacts(
    actionId: number,
    apiKey: string,
    userId: number,
  ): Promise<void> {
    let after: string | undefined;
    let totalFetched = 0;
    const limit = 100;

    try {
      do {
        this.logger.log(
          `Fetching contacts batch, offset: ${after || 'initial'}`,
        );

        let response: any;
        try {
          response = await this.hubspotApiService.fetchContactsPage(
            apiKey,
            after,
            limit,
          );
        } catch (error) {
          this.logger.error(
            'Failed to fetch contacts from HubSpot API after all retries:',
            error,
          );
          throw error;
        }

        const { results, paging } = response;

        if (results && results.length > 0) {
          await this.contactService.saveContacts(results, apiKey, userId);
          totalFetched += results.length;

          // Update action status with current progress
          await this.updateActionStatus(
            actionId,
            ActionStatus.FETCHING,
            totalFetched,
          );

          this.logger.log(
            `Fetched and saved ${results.length} contacts. Total: ${totalFetched}`,
          );
        }

        after = paging?.next?.after;
      } while (after);

      // Mark as completed
      await this.updateActionStatus(
        actionId,
        ActionStatus.FINISHED,
        totalFetched,
      );
      this.logger.log(
        `Completed fetching ${totalFetched} contacts for action ${actionId}`,
      );

      // Start duplicate detection process (async, non-blocking)
      await this.updateActionProcessName(actionId, 'filtering');

      // Clear existing matching data for this user and API key before finding new duplicates
      await this.duplicateDetectionService.clearExistingMatches(userId, apiKey);

      // Run duplicate detection in background to avoid blocking
      this.duplicateDetectionService
        .findAndSaveDuplicates(apiKey, userId)
        .then(async () => {
          // Mark process as ready for manual merge
          await this.updateActionProcessName(actionId, 'manually merge');
          this.logger.log(
            `Duplicate detection completed for action ${actionId}`,
          );
        })
        .catch(async (error) => {
          this.logger.error(
            `Duplicate detection failed for action ${actionId}:`,
            error,
          );
          await this.updateActionProcessName(actionId, 'error');
        });
    } catch (error) {
      this.logger.error(`Error fetching contacts:`, error);
      await this.updateActionStatus(actionId, ActionStatus.ERROR, totalFetched);
      throw error;
    }
  }

  private async updateActionStatus(
    actionId: number,
    status: ActionStatus,
    count: number,
  ): Promise<void> {
    await this.actionRepository.update(actionId, {
      status,
      count,
    });
  }

  private async updateActionProcessName(
    actionId: number,
    processName: string,
  ): Promise<void> {
    await this.actionRepository.update(actionId, {
      process_name: processName,
    });
  }

  async getActionStatus(actionId: number): Promise<Action | null> {
    return this.actionRepository.findOne({
      where: { id: actionId },
    });
  }

  async getUserActions(userId: number): Promise<Action[]> {
    return this.actionRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getMatchingGroups(userId: number, apiKey?: string) {
    return this.matchingService.getMatchingGroups(userId, apiKey);
  }

  async getDuplicatesWithPagination(
    userId: number,
    getDuplicatesDto: GetDuplicatesDto,
  ) {
    return this.matchingService.getDuplicatesWithPagination(
      userId,
      getDuplicatesDto,
    );
  }

  async submitMerge(userId: number, submitMergeDto: SubmitMergeDto) {
    return this.matchingService.submitMerge(userId, submitMergeDto);
  }

  async finishProcess(
    userId: number,
    finishProcessDto: FinishProcessDto,
  ): Promise<{ message: string; excelUrl?: string }> {
    const { apiKey } = finishProcessDto;
    console.log(userId, 'mmmmmmmmmmmm1', apiKey);

    // Initialize progress tracking
    this.progressService.updateProgress(userId, apiKey, {
      currentStep: 'Initializing process...',
      progress: 0,
      isComplete: false,
    });

    // Update process name to 'update hubspot'
    const action = await this.actionRepository.findOne({
      where: { user_id: userId, api_key: apiKey },
      order: { created_at: 'DESC' },
    });

    if (!action) {
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Error: Action not found',
        error: 'Action not found',
        isComplete: true,
      });
      throw new Error('Action not found');
    }

    await this.updateActionProcessName(action.id, 'update hubspot');

    try {
      // Step 1: Process existing merges in the merging table only
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Processing merges from merging table...',
        progress: 5,
      });
      await this.processExistingMerges(userId, apiKey);

      // Step 2: Clear the merging table after processing
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Clearing merging table...',
        progress: 30,
      });
      await this.clearMergingTable(userId, apiKey);

      // Step 3: Update contacts in HubSpot
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Updating modified contacts in HubSpot...',
        progress: 50,
      });
      await this.updateContactsInHubSpot(userId, apiKey);

      // Step 4: Remove contacts from HubSpot
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Removing marked contacts from HubSpot...',
        progress: 70,
      });
      await this.removeContactsFromHubSpot(userId, apiKey);

      // Step 5: Generate Excel file
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Generating Excel report...',
        progress: 85,
      });
      const contacts = await this.contactService.getAllContacts(userId, apiKey);
      const excelUrl = await this.fileGenerationService.generateExcelFile(
        userId,
        action.id,
        contacts,
      );

      // Step 6: Clean up data
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Cleaning up data...',
        progress: 95,
      });

      await this.cleanupUserData(userId, apiKey);

      // Update process name to 'finished'
      await this.updateActionProcessName(action.id, 'finished');

      // Update action with Excel URL
      await this.actionRepository.update(action.id, {
        excel_link: excelUrl,
      });

      // Mark process as complete
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Process completed successfully!',
        progress: 100,
        isComplete: true,
      });

      return {
        message: 'Process completed successfully',
        excelUrl,
      };
    } catch (error) {
      this.logger.error('Error finishing process:', error);
      await this.updateActionProcessName(action.id, 'error');

      // Update progress to show error
      this.progressService.updateProgress(userId, apiKey, {
        currentStep: 'Error occurred during processing',
        error: (error as Error).message,
        isComplete: true,
      });

      throw error;
    }
  }

  private async updateContactsInHubSpot(
    userId: number,
    apiKey: string,
  ): Promise<void> {
    console.log('mmmmmmmmmmmmmmmmmmmm');

    const modifiedContacts = await this.modifiedRepository.find({
      where: { userId, apiKey },
    });

    for (const modified of modifiedContacts) {
      const contact = await this.contactService.getContactById(
        modified.contactId,
      );

      if (contact && contact.hubspotId) {
        try {
          const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contact.hubspotId}`;

          // Filter out unwanted fields and prepare properties
          const {
            removedContactsCount,
            originalContactsCount,
            mergeTimestamp,
            hubspotId,
            ...filteredData
          } = modified.updatedData;

          // Prepare the properties object
          const properties: Record<string, string> = {};

          // Handle all fields except email first
          Object.keys(filteredData).forEach((key) => {
            if (key !== 'email' && key !== 'id') {
              properties[key.toLowerCase()] = filteredData[key];
            }
          });

          // Handle email field specially - split and add secondary_email if exists
          if (filteredData.email) {
            const emails = filteredData.email
              .split(',')
              .map((e: string) => e.trim())
              .filter((e: string) => e);

            if (emails.length > 0) {
              properties.email = emails[0];

              if (emails.length > 1) {
                properties.hs_additional_emails = emails[1];
              }
            }
          }

          await axios.patch(
            url,
            {
              properties,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          );

          console.log(properties, '00000000000000000000000', contact.hubspotId);

          this.logger.log(`Updated contact ${contact.hubspotId} in HubSpot`);
        } catch (error) {
          this.logger.error(
            `Failed to update contact ${contact.hubspotId} in HubSpot:`,
            error.response.data,
          );
        }
      }
    }
  }

  private async removeContactsFromHubSpot(
    userId: number,
    apiKey: string,
  ): Promise<void> {
    const removeContacts = await this.removeRepository.find({
      where: { userId, apiKey },
    });

    for (const remove of removeContacts) {
      const contact = await this.contactService.getContactById(
        remove.contactId,
      );

      if (contact && contact.hubspotId) {
        try {
          const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contact.hubspotId}`;

          await axios.delete(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          this.logger.log(`Removed contact ${contact.hubspotId} from HubSpot`);
        } catch (error) {
          this.logger.error(
            `Failed to remove contact ${contact.hubspotId} from HubSpot:`,
            error,
          );
        }
      }
    }
  }

  async debugDuplicateDetection(userId: number, apiKey: string): Promise<any> {
    this.logger.log(
      `Starting debug duplicate detection for user ${userId} with API key ${apiKey}`,
    );

    // Get all contacts for this user and API key
    const contacts = await this.contactService.getContactsForDuplicateAnalysis(
      userId,
      apiKey,
    );

    this.logger.log(
      `Found ${contacts.length} contacts to analyze for duplicates`,
    );

    // Group contacts by phone numbers to see duplicates
    const phoneGroups = new Map<string, any[]>();
    const emailGroups = new Map<string, any[]>();

    contacts.forEach((contact) => {
      if (contact.phone) {
        if (!phoneGroups.has(contact.phone)) {
          phoneGroups.set(contact.phone, []);
        }
        phoneGroups.get(contact.phone)!.push(contact);
      }

      if (contact.email) {
        if (!emailGroups.has(contact.email)) {
          emailGroups.set(contact.email, []);
        }
        emailGroups.get(contact.email)!.push(contact);
      }
    });

    // Find groups with more than 1 contact
    const duplicatePhoneGroups = Array.from(phoneGroups.entries()).filter(
      ([_, contacts]) => contacts.length > 1,
    );
    const duplicateEmailGroups = Array.from(emailGroups.entries()).filter(
      ([_, contacts]) => contacts.length > 1,
    );

    this.logger.log(
      `Found ${duplicatePhoneGroups.length} phone duplicate groups`,
    );
    this.logger.log(
      `Found ${duplicateEmailGroups.length} email duplicate groups`,
    );

    // Run the actual duplicate detection
    await this.duplicateDetectionService.findAndSaveDuplicates(apiKey, userId);

    // Get the results from matching table
    const matchingGroups = await this.matchingService.getMatchingGroups(
      userId,
      apiKey,
    );

    return {
      totalContacts: contacts.length,
      duplicatePhoneGroups: duplicatePhoneGroups.map(([phone, contacts]) => ({
        phone,
        contactIds: contacts.map((c) => c.id),
        count: contacts.length,
      })),
      duplicateEmailGroups: duplicateEmailGroups.map(([email, contacts]) => ({
        email,
        contactIds: contacts.map((c) => c.id),
        count: contacts.length,
      })),
      savedMatchingGroups: matchingGroups.length,
      matchingGroups: matchingGroups.map((g) => ({
        id: g.id,
        groupSize: g.group.length,
        contactIds: g.group,
      })),
    };
  }

  private async cleanupUserData(userId: number, apiKey: string): Promise<void> {
    console.log(apiKey, '44444444444444444444444444');

    // Remove all data except users and actions
    await this.contactService.deleteContactsByApiKey(apiKey);
    await this.matchingService.deleteMatchingByApiKey(apiKey);
    await this.matchingService.deleteModifiedByApiKey(apiKey);
    await this.matchingService.deleteRemovedByApiKey(apiKey);
    await this.mergingRepository.delete({ apiKey });

    this.logger.log(
      `Cleaned up data for user ${userId} with API key ${apiKey}`,
    );
  }

  async deleteActionById(
    userId: number,
    actionId: number,
    apiKey: string,
  ): Promise<void> {
    // First check if the action belongs to this user
    const action = await this.actionRepository.findOne({
      where: { id: actionId },
    });
    // Clean up all user data for this API key before deleting the action
    if (!action) {
      throw new Error('Action not found or does not belong to this user');
    }

    // Delete only the specific action record
    await this.cleanupUserData(userId, apiKey);
    await this.actionRepository.delete({ id: actionId });

    this.logger.log(`Deleted action ${actionId} for user ${userId}`);
  }

  async retryFailedAction(actionId: number): Promise<{
    message: string;
    action: Action;
  }> {
    const action = await this.actionRepository.findOne({
      where: { id: actionId },
    });

    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== ActionStatus.ERROR) {
      throw new Error('Action is not in error state and cannot be retried');
    }

    // Reset action status to retrying
    await this.updateActionStatus(
      actionId,
      ActionStatus.RETRYING,
      action.count,
    );

    // Restart the fetch process
    this.fetchAllContacts(actionId, action.api_key, action.user_id).catch(
      (error) => {
        this.logger.error(
          `Failed to retry fetch contacts for action ${actionId}:`,
          error,
        );
        void this.updateActionStatus(
          actionId,
          ActionStatus.ERROR,
          action.count,
        );
      },
    );

    const updatedAction = await this.actionRepository.findOne({
      where: { id: actionId },
    });

    return {
      message:
        'Action retry started successfully. This process will run in the background.',
      action: updatedAction!,
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoRetryFailedActions(): Promise<void> {
    this.logger.log('Running automatic retry for failed actions...');

    try {
      await this.autoRetryFailedActions();
    } catch (error) {
      this.logger.error('Error during automatic retry process:', error);
    }
  }

  async autoRetryFailedActions(): Promise<void> {
    this.logger.log('Checking for failed actions to retry...');

    const failedActions = await this.actionRepository.find({
      where: { status: ActionStatus.ERROR },
    });

    if (failedActions.length === 0) {
      this.logger.log('No failed actions found to retry');
      return;
    }

    this.logger.log(`Found ${failedActions.length} failed actions to retry`);

    for (const action of failedActions) {
      try {
        this.logger.log(`Auto-retrying action ${action.id}`);
        await this.retryFailedAction(action.id);
      } catch (error) {
        this.logger.error(
          `Failed to auto-retry action ${action.id}:`,
          error.message,
        );
      }
    }
  }

  async removeContact(userId: number, removeContactDto: RemoveContactDto) {
    return this.matchingService.removeContact(userId, removeContactDto);
  }

  async resetMergedGroup(
    userId: number,
    groupId: number,
    apiKey: string,
  ): Promise<{ message: string }> {
    return this.matchingService.resetMergedGroup(userId, groupId, apiKey);
  }

  async mergeContacts(userId: number, mergeContactsDto: MergeContactsDto) {
    return this.mergingService.mergeContacts(userId, mergeContactsDto);
  }

  async batchMergeContacts(
    userId: number,
    batchMergeContactsDto: BatchMergeContactsDto,
  ) {
    return this.mergingService.batchMergeContacts(
      userId,
      batchMergeContactsDto,
    );
  }

  async resetMergeByGroup(
    userId: number,
    resetMergeByGroupDto: ResetMergeByGroupDto,
  ) {
    return this.mergingService.resetMergeByGroup(
      userId,
      resetMergeByGroupDto.groupId,
      resetMergeByGroupDto.apiKey,
    );
  }

  private async mergeAllRemainingDuplicates(
    userId: number,
    apiKey: string,
  ): Promise<void> {
    this.logger.log(
      `Starting merge of all remaining duplicates for user ${userId}`,
    );

    try {
      // Get all remaining duplicate groups ordered by creation date (oldest first)
      const duplicateGroups = await this.matchingService.getMatchingGroups(
        userId,
        apiKey,
      );

      if (duplicateGroups.length === 0) {
        this.logger.log('No duplicate groups found to merge');
        this.progressService.updateProgress(userId, apiKey, {
          currentStep: 'No duplicate groups found to merge',
          totalGroups: 0,
          processedGroups: 0,
        });
        return;
      }

      this.logger.log(
        `Found ${duplicateGroups.length} duplicate groups to process`,
      );

      // Process in batches to handle large datasets efficiently
      const BATCH_SIZE = 10; // Process 10 groups at a time
      const totalBatches = Math.ceil(duplicateGroups.length / BATCH_SIZE);

      // Update progress with total counts
      this.progressService.updateProgress(userId, apiKey, {
        totalGroups: duplicateGroups.length,
        totalBatches,
        processedGroups: 0,
        currentBatch: 0,
      });

      for (let i = 0; i < duplicateGroups.length; i += BATCH_SIZE) {
        const batch = duplicateGroups.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;

        this.logger.log(`Processing batch ${currentBatch}/${totalBatches}`);

        // Update progress for current batch
        this.progressService.updateProgress(userId, apiKey, {
          currentStep: `Merging batch ${currentBatch}/${totalBatches}`,
          currentBatch,
          progress: 10 + (currentBatch / totalBatches) * 20, // Progress from 10% to 30%
        });

        // Process each group in the current batch
        for (let j = 0; j < batch.length; j++) {
          const group = batch[j];
          const totalProcessed = i + j + 1;

          try {
            // Update progress for individual group
            this.progressService.updateProgress(userId, apiKey, {
              currentStep: `Merging group ${totalProcessed}/${duplicateGroups.length}`,
              processedGroups: totalProcessed,
              progress: 10 + (totalProcessed / duplicateGroups.length) * 20,
            });

            await this.processDuplicateGroupForMerging(userId, apiKey, group);
          } catch (error) {
            this.logger.error(`Failed to process group ${group.id}:`, error);
            // Continue with next group instead of failing entire process
          }
        }

        // Small delay between batches to prevent overwhelming the system
        if (i + BATCH_SIZE < duplicateGroups.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      this.logger.log('Completed merging all remaining duplicates');
    } catch (error) {
      this.logger.error('Error merging remaining duplicates:', error);
      throw error;
    }
  }

  private async processExistingMerges(
    userId: number,
    apiKey: string,
  ): Promise<void> {
    this.logger.log(
      `Processing existing merges in merging table for user ${userId}`,
    );

    try {
      // Find all pending merges that haven't been processed yet
      const pendingMerges = await this.mergingRepository.find({
        where: { userId, apiKey, mergeStatus: 'pending' },
        order: { createdAt: 'ASC' },
      });

      if (pendingMerges.length === 0) {
        this.logger.log('No pending merges found in merging table');
        return;
      }

      this.logger.log(
        `Found ${pendingMerges.length} pending merges to process`,
      );

      // Process each pending merge
      for (let i = 0; i < pendingMerges.length; i++) {
        const merge = pendingMerges[i];

        try {
          // Update progress
          this.progressService.updateProgress(userId, apiKey, {
            currentStep: `Processing existing merge ${i + 1}/${pendingMerges.length}`,
            progress: 5 + ((i + 1) / pendingMerges.length) * 5, // Progress from 5% to 10%
          });

          // Get the contacts for this merge
          const primaryContact = await this.contactService.getAllContacts(
            userId,
            apiKey,
          );
          const primaryContactData = primaryContact.find(
            (c) => c.hubspotId === merge.primaryAccountId,
          );

          const secondaryContactData = primaryContact.find(
            (c) => c.hubspotId === merge.secondaryAccountId,
          );

          if (primaryContactData && secondaryContactData) {
            // Call the merging service to handle the actual merge
            await this.mergingService.mergeContacts(userId, {
              groupId: merge.groupId,
              primaryAccountId: merge.primaryAccountId,
              secondaryAccountId: merge.secondaryAccountId,
              apiKey: merge.apiKey,
            });

            this.logger.log(
              `Successfully processed existing merge: ${merge.primaryAccountId} <- ${merge.secondaryAccountId}`,
            );
          } else {
            // Mark as failed if contacts not found
            merge.mergeStatus = 'failed';
            await this.mergingRepository.save(merge);

            this.logger.log(
              `Failed to process merge - contacts not found: ${merge.primaryAccountId} <- ${merge.secondaryAccountId}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to process existing merge ${merge.id}:`,
            error,
          );

          // Mark as failed
          merge.mergeStatus = 'failed';
          await this.mergingRepository.save(merge);
        }
      }

      this.logger.log('Completed processing existing merges');
    } catch (error) {
      this.logger.error('Error processing existing merges:', error);
      throw error;
    }
  }

  private async clearMergingTable(
    userId: number,
    apiKey: string,
  ): Promise<void> {
    this.logger.log(`Clearing merging table for user ${userId}`);

    try {
      // Remove all merging entries for this user and API key
      const result = await this.mergingRepository.delete({
        userId,
        apiKey,
      });

      this.logger.log(
        `Cleared ${result.affected || 0} entries from merging table`,
      );
    } catch (error) {
      this.logger.error('Error clearing merging table:', error);
      throw error;
    }
  }

  private async processDuplicateGroupForMerging(
    userId: number,
    apiKey: string,
    group: any,
  ): Promise<void> {
    const { id: groupId, group: contactIds } = group;

    // Skip groups with less than 2 contacts
    if (contactIds.length < 2) {
      this.logger.log(
        `Skipping group ${groupId} - insufficient contacts (${contactIds.length})`,
      );
      return;
    }

    // Get contact details ordered by creation date (oldest first)
    const contacts = await this.contactService.getContactsByIds(contactIds);

    if (contacts.length < 2) {
      this.logger.log(
        `Skipping group ${groupId} - insufficient valid contacts found`,
      );
      return;
    }

    // Primary contact is the oldest (first in the array)
    const primaryContact = contacts[0];
    const secondaryContacts = contacts.slice(1);

    this.logger.log(
      `Merging group ${groupId}: Primary (${primaryContact.hubspotId}) + ${secondaryContacts.length} secondary contacts`,
    );

    // Use batch merge for efficiency when multiple secondary contacts
    if (secondaryContacts.length > 1) {
      const secondaryIds = secondaryContacts.map((c) => c.hubspotId);

      await this.mergingService.batchMergeContacts(userId, {
        groupId,
        primaryAccountId: primaryContact.hubspotId,
        secondaryAccountIds: secondaryIds,
        apiKey,
      });
    } else {
      // Single merge for just one secondary contact
      await this.mergingService.mergeContacts(userId, {
        groupId,
        primaryAccountId: primaryContact.hubspotId,
        secondaryAccountId: secondaryContacts[0].hubspotId,
        apiKey,
      });
    }

    this.logger.log(`Successfully merged group ${groupId}`);
  }

  async markContactForRemoval(
    userId: number,
    contactId: string,
    groupId: string,
    apiKey: string,
  ) {
    return this.removalService.addContactToRemoveTable(
      userId,
      parseInt(contactId),
      parseInt(groupId),
      apiKey,
    );
  }
}
