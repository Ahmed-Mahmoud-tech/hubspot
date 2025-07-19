import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Contact } from '../entities/contact.entity';
import { Action, ActionStatus } from '../entities/action.entity';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { Modified } from '../entities/modified.entity';
import { Remove } from '../entities/remove.entity';
import {
  StartHubSpotFetchDto,
  GetDuplicatesDto,
  SubmitMergeDto,
  FinishProcessDto,
} from '../dto/hubspot.dto';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { json } from 'stream/consumers';

interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    createdate?: string;
    lastmodifieddate?: string;
    [key: string]: string | undefined;
  };
  [key: string]: any;
}

interface HubSpotListResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Action)
    private actionRepository: Repository<Action>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Matching)
    private matchingRepository: Repository<Matching>,
    @InjectRepository(Modified)
    private modifiedRepository: Repository<Modified>,
    @InjectRepository(Remove)
    private removeRepository: Repository<Remove>,
  ) {}

  async startFetch(
    userId: number,
    startHubSpotFetchDto: StartHubSpotFetchDto,
  ): Promise<{ message: string; action: Action }> {
    const { name, apiKey } = startHubSpotFetchDto;

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
  }

  private async makeHubSpotAPIRequest(
    url: string,
    apiKey: string,
    params: any,
    maxRetries: number = 3,
    retryDelay: number = 5000,
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `API request attempt ${attempt}/${maxRetries} to ${url}`,
        );

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          params: params as Record<string, string | number>,
        });

        this.logger.log(`API request successful on attempt ${attempt}`);
        console.log(JSON.stringify(response.data, null, 2));

        return response;
      } catch (error) {
        lastError = error;
        const errorMessage = error.response?.data?.message || error.message;
        const statusCode = error.response?.status;

        this.logger.warn(
          `API request attempt ${attempt}/${maxRetries} failed with status ${statusCode}: ${errorMessage}`,
        );

        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          // Exponential backoff: increase delay for next retry
          retryDelay *= 2;
        }
      }
    }

    this.logger.error(
      `All ${maxRetries} API request attempts failed. Last error:`,
      lastError.response?.data || lastError.message,
    );
    throw new Error(
      `HubSpot API request failed after ${maxRetries} attempts: ${
        lastError.response?.data?.message || lastError.message
      }`,
    );
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
        const properties = [
          'firstname',
          'lastname',
          'email',
          'phone',
          'company',
        ].join(',');

        const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=${properties}`;
        // const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
        const params: any = {
          limit,
          properties: [
            'email',
            'firstname',
            'lastname',
            'phone',
            'company',
            'createdate',
            'lastmodifieddate',
            'hs_object_id',
          ],
        };

        if (after) {
          params.after = after;
        }

        let response: any;
        try {
          response = await this.makeHubSpotAPIRequest(url, apiKey, params);
        } catch (error) {
          this.logger.error(
            'Failed to fetch contacts from HubSpot API after all retries:',
            error,
          );
          throw error;
        }

        const { results, paging } = response.data as HubSpotListResponse;

        if (results && results.length > 0) {
          await this.saveContacts(results, apiKey, userId);
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
      await this.matchingRepository.delete({ userId, apiKey });

      // Run duplicate detection in background to avoid blocking
      this.findAndSaveDuplicates(apiKey, userId)
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

  private async saveContacts(
    hubspotContacts: HubSpotContact[],
    apiKey: string,
    userId: number,
  ): Promise<void> {
    const contactEntities = hubspotContacts.map((hsContact) => ({
      hubspotId: hsContact.id,
      email: hsContact.properties.email || undefined,
      firstName: hsContact.properties.firstname || undefined,
      lastName: hsContact.properties.lastname || undefined,
      phone: hsContact.properties.phone || undefined,
      company: hsContact.properties.company || undefined,
      createDate: hsContact.properties.createdate
        ? new Date(hsContact.properties.createdate)
        : undefined,
      lastModifiedDate: hsContact.properties.lastmodifieddate
        ? new Date(hsContact.properties.lastmodifieddate)
        : undefined,
      apiKey,
      user: { id: userId },
    }));

    // Use save with upsert option to handle potential duplicates
    await this.contactRepository.save(contactEntities, { chunk: 50 });
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

  async findAndSaveDuplicates(apiKey: string, userId: number): Promise<void> {
    this.logger.log('Starting SQL-based duplicate detection process...');

    // Get total count first
    const totalCount = await this.contactRepository.count({
      where: { apiKey, user: { id: userId } },
    });

    this.logger.log(`Found ${totalCount} contacts to analyze for duplicates`);

    const duplicateGroups: number[][] = [];
    const processedContacts = new Set<number>();

    try {
      // 1. Find duplicates by email using SQL
      this.logger.log('Finding email duplicates using SQL...');
      const emailDuplicates = await this.contactRepository.query(
        `
        SELECT email, array_agg(id) as contact_ids, count(*) as count
        FROM contacts 
        WHERE "api_key" = $1 AND "user_id" = $2 
          AND email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING count(*) > 1
      `,
        [apiKey, userId],
      );

      for (const group of emailDuplicates) {
        const contactIds = group.contact_ids;
        duplicateGroups.push(contactIds);
        // Mark these contacts as processed
        contactIds.forEach((id: number) => processedContacts.add(id));
        this.logger.log(
          `Found email duplicate group: ${contactIds.length} contacts with email "${group.email}"`,
        );
      }

      this.logger.log(`Found ${emailDuplicates.length} email duplicate groups`);

      // 2. Find duplicates by phone using SQL (excluding already processed contacts)
      this.logger.log('Finding phone duplicates using SQL...');
      const phoneDuplicates = await this.contactRepository.query(
        `
        SELECT phone, array_agg(id) as contact_ids, count(*) as count
        FROM contacts 
        WHERE "api_key" = $1 AND "user_id" = $2 
          AND phone IS NOT NULL AND phone != ''
        GROUP BY phone
        HAVING count(*) > 1
      `,
        [apiKey, userId],
      );

      for (const group of phoneDuplicates) {
        const contactIds = group.contact_ids;

        // Check if any of these contacts are already processed
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );

        if (unprocessedIds.length > 1) {
          // Only add if we have more than 1 unprocessed contact
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found phone duplicate group: ${unprocessedIds.length} contacts with phone "${group.phone}"`,
          );
        } else if (unprocessedIds.length === 1) {
          // Check if this contact should be merged with existing group
          const existingGroupIndex = duplicateGroups.findIndex(
            (existingGroup) =>
              contactIds.some((id: number) => existingGroup.includes(id)),
          );

          if (existingGroupIndex >= 0) {
            // Add unprocessed contact to existing group
            duplicateGroups[existingGroupIndex].push(unprocessedIds[0]);
            processedContacts.add(unprocessedIds[0]);
            this.logger.log(
              `Merged contact ${unprocessedIds[0]} with existing group by phone`,
            );
          }
        }
      }

      this.logger.log(`Processed ${phoneDuplicates.length} phone groups`);

      // 3. Find duplicates by first name + last name + company using SQL
      this.logger.log('Finding name+company duplicates using SQL...');
      const nameCompanyDuplicates = await this.contactRepository.query(
        `
        SELECT "first_name", "last_name", company, array_agg(id) as contact_ids, count(*) as count
        FROM contacts 
        WHERE "api_key" = $1 AND "user_id" = $2 
          AND "first_name" IS NOT NULL AND "first_name" != ''
          AND "last_name" IS NOT NULL AND "last_name" != ''
          AND company IS NOT NULL AND company != ''
        GROUP BY "first_name", "last_name", company
        HAVING count(*) > 1
      `,
        [apiKey, userId],
      );

      for (const group of nameCompanyDuplicates) {
        const contactIds = group.contact_ids;

        // Check if any of these contacts are already processed
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );

        if (unprocessedIds.length > 1) {
          // Only add if we have more than 1 unprocessed contact
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found name+company duplicate group: ${unprocessedIds.length} contacts with name "${group.first_name} ${group.last_name}" at "${group.company}"`,
          );
        } else if (unprocessedIds.length === 1) {
          // Check if this contact should be merged with existing group
          const existingGroupIndex = duplicateGroups.findIndex(
            (existingGroup) =>
              contactIds.some((id: number) => existingGroup.includes(id)),
          );

          if (existingGroupIndex >= 0) {
            // Add unprocessed contact to existing group
            duplicateGroups[existingGroupIndex].push(unprocessedIds[0]);
            processedContacts.add(unprocessedIds[0]);
            this.logger.log(
              `Merged contact ${unprocessedIds[0]} with existing group by name+company`,
            );
          }
        }
      }

      this.logger.log(
        `Processed ${nameCompanyDuplicates.length} name+company groups`,
      );

      // Filter out any groups that somehow ended up with only 1 contact
      const validGroups = duplicateGroups.filter((group) => group.length > 1);

      this.logger.log(
        `Completed SQL-based duplicate detection. Found ${validGroups.length} total duplicate groups containing ${processedContacts.size} duplicate contacts out of ${totalCount} total contacts`,
      );

      // Save each duplicate group as a separate row in matching table
      if (validGroups.length > 0) {
        this.logger.log(
          `Preparing to save ${validGroups.length} duplicate groups to database...`,
        );

        const matchingEntities = validGroups.map((group) =>
          this.matchingRepository.create({
            group: group, // Store contact IDs array directly
            apiKey,
            userId,
          }),
        );

        // Save in batches to avoid parameter limit issues
        const batchSize = 50; // Reduced batch size for better reliability
        let savedCount = 0;

        try {
          for (let i = 0; i < matchingEntities.length; i += batchSize) {
            const batch = matchingEntities.slice(i, i + batchSize);
            await this.matchingRepository.save(batch);
            savedCount += batch.length;

            this.logger.log(
              `Saved batch ${Math.floor(i / batchSize) + 1}: ${batch.length} groups (Total: ${savedCount}/${matchingEntities.length})`,
            );
          }

          this.logger.log(
            `Successfully saved ${validGroups.length} duplicate groups (${processedContacts.size} duplicate contacts) to matching table as separate rows`,
          );
        } catch (saveError) {
          this.logger.error(
            'Error saving duplicate groups to database:',
            saveError,
          );
          throw new Error(
            `Failed to save duplicate groups: ${saveError.message}`,
          );
        }
      } else {
        this.logger.log('No duplicate groups found, nothing to save');
      }
    } catch (error) {
      this.logger.error('Error in SQL-based duplicate detection:', error);
      throw error;
    }
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

  async getMatchingGroups(
    userId: number,
    apiKey?: string,
  ): Promise<Matching[]> {
    const whereCondition: Record<string, any> = { userId };
    if (apiKey) {
      whereCondition.apiKey = apiKey;
    }

    return this.matchingRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
  }

  async getDuplicatesWithPagination(
    userId: number,
    getDuplicatesDto: GetDuplicatesDto,
  ): Promise<{
    data: Array<{
      id: number;
      merged: boolean;
      group: Array<{
        id: number;
        hubspotId: string;
        lastModifiedDate?: Date;
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        company?: string;
      }>;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { apiKey, page = 1, limit = 10 } = getDuplicatesDto;

    // Build where condition for matching groups
    const whereCondition: Record<string, any> = { userId };
    if (apiKey) {
      whereCondition.apiKey = apiKey;
    }

    // Get total count of groups
    const total = await this.matchingRepository.count({
      where: whereCondition,
    });

    this.logger.log(
      `Found ${total} total duplicate groups (merged and unmerged) for pagination`,
    );

    if (total === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Apply pagination to get the matching records
    const offset = (page - 1) * limit;
    const matchingRecords = await this.matchingRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    // Convert matching records to the expected format with contact details
    const data = await Promise.all(
      matchingRecords.map(async (matchingRecord) => {
        const contactIds = matchingRecord.group; // This is now directly an array of contact IDs

        // Get full contact details for each contact ID in the group
        const contacts = await this.contactRepository.find({
          where: { id: In(contactIds) },
          select: [
            'id',
            'email',
            'firstName',
            'lastName',
            'phone',
            'company',
            'hubspotId',
            'lastModifiedDate',
          ],
        });

        // Create a map for quick lookup
        const contactMap = new Map(contacts.map((c) => [c.id, c]));

        // Build group with contact details in the same order as group array
        const groupWithDetails = contactIds
          .map((contactId) => contactMap.get(contactId))
          .filter((contact) => contact !== undefined)
          .map((contact) => ({
            id: contact.id,
            hubspotId: contact.hubspotId,
            lastModifiedDate: contact.lastModifiedDate,
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            company: contact.company,
          }));

        return {
          id: matchingRecord.id, // Use the actual matching record ID
          merged: matchingRecord.merged, // Include merged status
          group: groupWithDetails,
        };
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async submitMerge(
    userId: number,
    submitMergeDto: SubmitMergeDto,
  ): Promise<{ message: string; details: any }> {
    const {
      groupId,
      selectedContactId,
      selectedContactHubspotId,
      updatedData,
      removedIds,
      allContactsData,
      apiKey,
      updateHubSpot = true,
    } = submitMergeDto;

    // Find the specific matching record by ID
    const matchingRecord = await this.matchingRepository.findOne({
      where: { id: groupId, userId, apiKey },
    });

    if (!matchingRecord) {
      throw new Error('Matching record not found or access denied');
    }

    // Verify that the selected contact is part of this group
    const contactIds = matchingRecord.group; // This is now directly an array of contact IDs
    if (!contactIds.includes(selectedContactId)) {
      throw new Error('Selected contact is not part of this duplicate group');
    }

    // Get the removed contacts data with their HubSpot IDs
    const removedContactsData = allContactsData.filter((contact) =>
      removedIds.includes(contact.id),
    );

    // Save updated data for the selected contact (the one being kept)
    const modifiedData = {
      ...updatedData,
      mergeTimestamp: new Date().toISOString(),
      originalContactsCount: allContactsData.length,
      removedContactsCount: removedIds.length,
    };

    const modified = this.modifiedRepository.create({
      contactId: selectedContactId,
      updatedData: modifiedData,
      apiKey,
      userId,
      groupId,
    });
    await this.modifiedRepository.save(modified);

    // Save removed contact IDs with their HubSpot IDs for reference
    for (const removedContact of removedContactsData) {
      const remove = this.removeRepository.create({
        contactId: removedContact.id as number,
        apiKey,
        userId,
        groupId,
      });
      await this.removeRepository.save(remove);
    }

    // Mark the group as merged instead of deleting it
    matchingRecord.merged = true;
    await this.matchingRepository.save(matchingRecord);

    // Update the contact in HubSpot if we have a HubSpot ID and updateHubSpot is enabled
    let hubspotUpdateResult: { success: boolean; error?: string } | null = null;
    if (updateHubSpot && selectedContactHubspotId && apiKey) {
      this.logger.log(
        `Updating HubSpot contact ${selectedContactHubspotId} with new data`,
      );

      hubspotUpdateResult = await this.updateHubSpotContact(
        selectedContactHubspotId,
        apiKey,
        updatedData,
      );

      if (!hubspotUpdateResult.success) {
        this.logger.warn(
          `Failed to update HubSpot contact ${selectedContactHubspotId}: ${hubspotUpdateResult.error}`,
        );
      }
    }

    // Optionally delete removed contacts from HubSpot
    const hubspotDeleteResults: Array<{
      contactId: number;
      hubspotId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const removedContact of removedContactsData) {
      if (updateHubSpot && removedContact.hubspotId && apiKey) {
        this.logger.log(`Deleting HubSpot contact ${removedContact.hubspotId}`);

        const deleteResult = await this.deleteHubSpotContact(
          removedContact.hubspotId as string,
          apiKey,
        );

        hubspotDeleteResults.push({
          contactId: removedContact.id as number,
          hubspotId: removedContact.hubspotId as string,
          success: deleteResult.success,
          error: deleteResult.error,
        });

        if (!deleteResult.success) {
          this.logger.warn(
            `Failed to delete HubSpot contact ${removedContact.hubspotId}: ${deleteResult.error}`,
          );
        }
      }
    }

    // Build merge details response
    const mergeDetails = {
      selectedContact: {
        id: selectedContactId,
        hubspotId: selectedContactHubspotId,
      },
      removedContacts: removedContactsData.map((contact) => ({
        id: contact.id as number,
        hubspotId: contact.hubspotId as string,
      })),
      updatedFields: Object.keys(updatedData).filter(
        (key) =>
          ![
            'recordId',
            'hubspotId',
            'mergeTimestamp',
            'originalContactsCount',
            'removedContactsCount',
          ].includes(key),
      ),
      mergeTimestamp: new Date().toISOString(),
      hubspotOperations: {
        updateResult: hubspotUpdateResult,
        deleteResults: hubspotDeleteResults,
      },
    };

    this.logger.log(
      `Merge submitted for group ${groupId}: ` +
        `kept contact ${selectedContactId} (HubSpot ID: ${selectedContactHubspotId}), ` +
        `removed contacts ${removedContactsData.map((c) => c.hubspotId).join(', ')} ` +
        `with ${mergeDetails.updatedFields.length} field updates`,
    );

    return {
      message: 'Merge submitted successfully with enhanced tracking',
      details: mergeDetails,
    };
  }

  async finishProcess(
    userId: number,
    finishProcessDto: FinishProcessDto,
  ): Promise<{ message: string; excelUrl?: string }> {
    const { apiKey } = finishProcessDto;
    console.log(userId, 'mmmmmmmmmmmm1', apiKey);

    // Update process name to 'update hubspot'
    const action = await this.actionRepository.findOne({
      where: { user_id: userId, api_key: apiKey },
      order: { created_at: 'DESC' },
    });

    if (!action) {
      throw new Error('Action not found');
    }

    await this.updateActionProcessName(action.id, 'update hubspot');

    try {
      // Update contacts in HubSpot
      await this.updateContactsInHubSpot(userId, apiKey);

      // Remove contacts from HubSpot
      await this.removeContactsFromHubSpot(userId, apiKey);

      // Generate Excel file
      const excelUrl = await this.generateExcelFile(userId, apiKey, action.id);

      // Clean up data
      await this.cleanupUserData(userId, apiKey);

      // Update process name to 'finished'
      await this.updateActionProcessName(action.id, 'finished');

      // Update action with Excel URL
      await this.actionRepository.update(action.id, {
        excel_link: excelUrl,
      });

      return {
        message: 'Process completed successfully',
        excelUrl,
      };
    } catch (error) {
      this.logger.error('Error finishing process:', error);
      await this.updateActionProcessName(action.id, 'error');
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
      const contact = await this.contactRepository.findOne({
        where: { id: modified.contactId },
      });

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

          // console.log(properties, 'Properties to update in HubSpot');

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
      const contact = await this.contactRepository.findOne({
        where: { id: remove.contactId },
      });

      // if (contact && contact.hubspotId) {
      //   try {
      //     const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contact.hubspotId}`;

      //     await axios.delete(url, {
      //       headers: {
      //         Authorization: `Bearer ${apiKey}`,
      //         'Content-Type': 'application/json',
      //       },
      //     });

      //     this.logger.log(`Removed contact ${contact.hubspotId} from HubSpot`);
      //   } catch (error) {
      //     this.logger.error(
      //       `Failed to remove contact ${contact.hubspotId} from HubSpot:`,
      //       error,
      //     );
      //   }
      // }
    }
  }

  private async generateExcelFile(
    userId: number,
    apiKey: string,
    actionId: number,
  ): Promise<string> {
    // Get all contacts for this user and API key
    const contacts = await this.contactRepository.find({
      where: { user: { id: userId }, apiKey },
      select: [
        'id',
        'hubspotId',
        'email',
        'firstName',
        'lastName',
        'phone',
        'company',
        'createDate',
        'lastModifiedDate',
      ],
    });

    // Convert to CSV format
    const csvHeader =
      'ID,HubSpot ID,Email,First Name,Last Name,Phone,Company,Create Date,Last Modified Date\n';

    const csvRows = contacts
      .map((contact) => {
        const fields = [
          contact.id,
          contact.hubspotId || '',
          contact.email || '',
          contact.firstName || '',
          contact.lastName || '',
          contact.phone || '',
          contact.company || '',
          contact.createDate?.toISOString() || '',
          contact.lastModifiedDate?.toISOString() || '',
        ];
        return fields
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename
    const fileName = `contacts_${userId}_${actionId}_${Date.now()}.csv`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    fs.writeFileSync(filePath, csvContent, 'utf8');

    // Return URL
    const fileUrl = `/uploads/${fileName}`;

    this.logger.log(`Generated CSV file: ${fileUrl}`);
    return fileUrl;
  }

  async debugDuplicateDetection(userId: number, apiKey: string): Promise<any> {
    this.logger.log(
      `Starting debug duplicate detection for user ${userId} with API key ${apiKey}`,
    );

    // Get all contacts for this user and API key
    const contacts = await this.contactRepository.find({
      where: { apiKey, user: { id: userId } },
      select: ['id', 'email', 'phone', 'firstName', 'lastName', 'company'],
    });

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
    await this.findAndSaveDuplicates(apiKey, userId);

    // Get the results from matching table
    const matchingGroups = await this.matchingRepository.find({
      where: { userId, apiKey },
    });

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
    // Remove all data except users and actions
    await this.contactRepository.delete({ user: { id: userId }, apiKey });
    await this.matchingRepository.delete({ userId, apiKey });
    await this.modifiedRepository.delete({ userId, apiKey });
    await this.removeRepository.delete({ userId, apiKey });

    this.logger.log(
      `Cleaned up data for user ${userId} with API key ${apiKey}`,
    );
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

  async resetMergedGroup(
    userId: number,
    groupId: number,
    apiKey: string,
  ): Promise<{ message: string }> {
    // Find the merged group
    const matchingRecord = await this.matchingRepository.findOne({
      where: { id: groupId, userId, apiKey, merged: true },
    });

    if (!matchingRecord) {
      throw new Error('Merged group not found or does not belong to user');
    }

    // Reset the merged status to false
    await this.matchingRepository.update(groupId, { merged: false });

    // Remove records from modified table for this group
    const modifiedDeleteResult = await this.modifiedRepository.delete({
      groupId,
      apiKey,
      userId,
    });

    // Remove records from remove table for this group
    const removeDeleteResult = await this.removeRepository.delete({
      groupId,
      apiKey,
      userId,
    });

    this.logger.log(
      `Reset merged group ${groupId} for user ${userId}. ` +
        `Deleted ${modifiedDeleteResult.affected || 0} modified records and ` +
        `${removeDeleteResult.affected || 0} remove records`,
    );

    return { message: 'Group successfully reset to unmerged state' };
  }

  /**
   * Update a contact in HubSpot with new data
   */
  private async updateHubSpotContact(
    hubspotId: string,
    apiKey: string,
    updateData: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Prepare the update payload for logging purposes
      const properties: Record<string, string> = {};

      // Handle standard fields
      if (updateData.firstName) properties.firstname = updateData.firstName;
      if (updateData.lastName) properties.lastname = updateData.lastName;
      if (updateData.phone) properties.phone = updateData.phone;
      if (updateData.company) properties.company = updateData.company;

      // Handle multiple emails - HubSpot primary email + custom fields for additional emails
      if (updateData.email) {
        const emails = updateData.email
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e);

        if (emails.length > 0) {
          // Set primary email
          properties.email = emails[0];

          // Handle additional emails using custom properties
          if (emails.length > 1) {
            properties.hs_additional_emails = emails[1];
          }
          if (emails.length > 2) {
            properties.tertiary_email = emails[2];
          }
          // Log if there are more than 3 emails
          if (emails.length > 3) {
            this.logger.warn(
              `Contact ${hubspotId} has ${emails.length} emails. Only first 3 will be updated in HubSpot.`,
            );
          }
        }
      }

      // Skip actual HubSpot API call - just log the operation
      this.logger.log(
        `Skipping HubSpot API call - Would update contact ${hubspotId} with properties: ${Object.keys(properties).join(', ')}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to prepare HubSpot contact update for ${hubspotId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete/merge contacts in HubSpot - removes duplicate contacts
   */
  private async deleteHubSpotContact(
    hubspotId: string,
    apiKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Skip actual HubSpot API call - just log the operation
      this.logger.log(
        `Skipping HubSpot API call - Would delete contact ${hubspotId}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to prepare HubSpot contact deletion for ${hubspotId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
