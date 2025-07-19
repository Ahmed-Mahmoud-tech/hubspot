import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merging } from '../entities/merging.entity';
import { Contact } from '../entities/contact.entity';
import { User } from '../entities/user.entity';
import { Matching } from '../entities/matching.entity';
import { MergeContactsDto, BatchMergeContactsDto } from '../dto/hubspot.dto';
import axios from 'axios';

@Injectable()
export class MergingService {
  constructor(
    @InjectRepository(Merging)
    private mergingRepository: Repository<Merging>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Matching)
    private matchingRepository: Repository<Matching>,
  ) {}

  async mergeContacts(userId: number, mergeContactsDto: MergeContactsDto) {
    const { groupId, primaryAccountId, secondaryAccountId, apiKey } =
      mergeContactsDto;

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate that both contacts exist and belong to the user
    const primaryContact = await this.contactRepository.findOne({
      where: { hubspotId: primaryAccountId, user: { id: userId }, apiKey },
    });

    const secondaryContact = await this.contactRepository.findOne({
      where: { hubspotId: secondaryAccountId, user: { id: userId }, apiKey },
    });

    if (!primaryContact) {
      throw new NotFoundException('Primary contact not found');
    }

    if (!secondaryContact) {
      throw new NotFoundException('Secondary contact not found');
    }

    // Check if a merge record already exists for this group
    const existingMerge = await this.mergingRepository.findOne({
      where: { userId, groupId, apiKey },
    });

    if (existingMerge) {
      throw new BadRequestException('Merge already exists for this group');
    }

    try {
      // Create merge record
      const mergeRecord = this.mergingRepository.create({
        userId,
        apiKey,
        groupId,
        primaryAccountId,
        secondaryAccountId,
        mergeStatus: 'pending',
      });

      await this.mergingRepository.save(mergeRecord);

      // Here you would typically call HubSpot API to perform the actual merge
      // For now, we'll just update the status to completed
      await this.performActualMerge(
        mergeRecord,
        primaryContact,
        secondaryContact,
      );

      // Update merge status
      mergeRecord.mergeStatus = 'completed';
      mergeRecord.mergedAt = new Date();
      await this.mergingRepository.save(mergeRecord);

      // Mark the group as merged in the matching table
      await this.markGroupAsMerged(userId, groupId, apiKey);

      return {
        success: true,
        message: 'Contacts merged successfully',
        mergeId: mergeRecord.id,
        primaryAccountId,
        secondaryAccountId,
      };
    } catch (error) {
      // Update merge status to failed if something went wrong
      const mergeRecord = await this.mergingRepository.findOne({
        where: { userId, groupId, apiKey },
      });

      if (mergeRecord) {
        mergeRecord.mergeStatus = 'failed';
        await this.mergingRepository.save(mergeRecord);
      }

      throw new BadRequestException(`Merge failed: ${error.message}`);
    }
  }

  private async performActualMerge(
    mergeRecord: Merging,
    primaryContact: Contact,
    secondaryContact: Contact,
  ) {
    try {
      // 1. Call HubSpot API to actually merge the contacts
      await this.mergeContactsInHubSpot(
        mergeRecord.apiKey,
        primaryContact.hubspotId,
        secondaryContact.hubspotId,
      );

      // 2. Update local database records after successful HubSpot merge
      const updatedData: Partial<Contact> = {};

      // Merge logic: combine data from both contacts
      const combinedEmails = [primaryContact.email, secondaryContact.email]
        .filter(Boolean)
        .join(', ');

      if (combinedEmails) {
        updatedData.email = combinedEmails;
      }

      // Keep primary data, but fill in missing fields from secondary
      if (!primaryContact.phone && secondaryContact.phone) {
        updatedData.phone = secondaryContact.phone;
      }
      if (!primaryContact.company && secondaryContact.company) {
        updatedData.company = secondaryContact.company;
      }
      if (!primaryContact.firstName && secondaryContact.firstName) {
        updatedData.firstName = secondaryContact.firstName;
      }
      if (!primaryContact.lastName && secondaryContact.lastName) {
        updatedData.lastName = secondaryContact.lastName;
      }

      // Update primary contact with merged data
      if (Object.keys(updatedData).length > 0) {
        await this.contactRepository.update(primaryContact.id, updatedData);
      }

      // Mark secondary contact as merged/inactive
      await this.contactRepository.update(secondaryContact.id, {
        lastModifiedDate: new Date(),
      });

      // Remove the secondary contact from all duplicate groups since it's been merged
      await this.removeContactFromDuplicateGroups(
        mergeRecord.userId,
        secondaryContact.id,
        mergeRecord.apiKey,
      );

      console.log(
        `Successfully merged contacts in HubSpot: ${primaryContact.hubspotId} <- ${secondaryContact.hubspotId}`,
      );
    } catch (error) {
      console.error(`Failed to merge contacts in HubSpot:`, error);
      throw new Error(`HubSpot merge failed: ${error.message}`);
    }
  }

  private async mergeContactsInHubSpot(
    apiKey: string,
    primaryContactId: string,
    secondaryContactId: string,
  ): Promise<void> {
    try {
      // HubSpot merge contacts API endpoint
      const mergeUrl = `https://api.hubapi.com/crm/v3/objects/contacts/merge`;

      const mergePayload = {
        primaryObjectId: primaryContactId,
        objectIdToMerge: secondaryContactId,
      };

      const response = await axios.post(mergeUrl, mergePayload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`HubSpot merge successful:`, response.data);
    } catch (error) {
      console.error(
        `HubSpot merge API error:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getMergeHistory(userId: number, apiKey?: string) {
    const whereCondition: any = { userId };
    if (apiKey) {
      whereCondition.apiKey = apiKey;
    }

    const merges = await this.mergingRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    return merges;
  }

  async getMergeById(userId: number, mergeId: number) {
    const merge = await this.mergingRepository.findOne({
      where: { id: mergeId, userId },
      relations: ['user'],
    });

    if (!merge) {
      throw new NotFoundException('Merge record not found');
    }

    return merge;
  }

  async resetMerge(userId: number, mergeId: number) {
    const merge = await this.getMergeById(userId, mergeId);

    if (merge.mergeStatus !== 'completed') {
      throw new BadRequestException('Can only reset completed merges');
    }

    // Here you would implement the reset logic
    // This might involve calling HubSpot API to undo the merge
    // For now, we'll just mark it as reset
    merge.mergeStatus = 'reset';
    await this.mergingRepository.save(merge);

    // Mark the group as unmerged in the matching table
    await this.markGroupAsUnmerged(userId, merge.groupId, merge.apiKey);

    return {
      success: true,
      message: 'Merge reset successfully',
      mergeId: merge.id,
    };
  }

  async resetMergeByGroup(userId: number, groupId: number, apiKey: string) {
    // Find all completed merges for this group
    const merges = await this.mergingRepository.find({
      where: { userId, groupId, apiKey, mergeStatus: 'completed' },
    });

    if (merges.length === 0) {
      throw new NotFoundException('No completed merges found for this group');
    }

    // Reset all merges for this group
    for (const merge of merges) {
      merge.mergeStatus = 'reset';
      await this.mergingRepository.save(merge);
    }

    // Mark the group as unmerged in the matching table
    await this.markGroupAsUnmerged(userId, groupId, apiKey);

    return {
      success: true,
      message: `Reset ${merges.length} merge(s) for group ${groupId}`,
      groupId,
      resetCount: merges.length,
    };
  }

  async batchMergeContacts(
    userId: number,
    batchMergeContactsDto: BatchMergeContactsDto,
  ) {
    const { groupId, primaryAccountId, secondaryAccountIds, apiKey } =
      batchMergeContactsDto;

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate primary contact
    const primaryContact = await this.contactRepository.findOne({
      where: { hubspotId: primaryAccountId, user: { id: userId }, apiKey },
    });

    if (!primaryContact) {
      throw new NotFoundException('Primary contact not found');
    }

    const mergeResults: Array<{
      secondaryAccountId: string;
      success: boolean;
      mergeId?: number;
    }> = [];
    const errors: Array<{
      secondaryAccountId: string;
      success: boolean;
      error: string;
    }> = [];

    // Process each secondary contact
    for (const secondaryAccountId of secondaryAccountIds) {
      try {
        const mergeData: MergeContactsDto = {
          groupId,
          primaryAccountId,
          secondaryAccountId,
          apiKey,
        };

        const result = await this.mergeContacts(userId, mergeData);
        mergeResults.push({
          secondaryAccountId,
          success: true,
          mergeId: result.mergeId,
        });
      } catch (error) {
        errors.push({
          secondaryAccountId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `Batch merge completed. ${mergeResults.length} successful, ${errors.length} failed.`,
      primaryAccountId,
      results: mergeResults,
      errors,
    };
  }

  private async markGroupAsMerged(
    userId: number,
    groupId: number,
    apiKey: string,
  ) {
    try {
      const matchingGroup = await this.matchingRepository.findOne({
        where: { id: groupId, userId, apiKey },
      });

      if (matchingGroup) {
        matchingGroup.merged = true;
        await this.matchingRepository.save(matchingGroup);
      }
    } catch (error) {
      // Log error but don't fail the merge operation
      console.error(
        `Failed to mark group ${groupId} as merged:`,
        error.message,
      );
    }
  }

  private async markGroupAsUnmerged(
    userId: number,
    groupId: number,
    apiKey: string,
  ) {
    try {
      const matchingGroup = await this.matchingRepository.findOne({
        where: { id: groupId, userId, apiKey },
      });

      if (matchingGroup) {
        matchingGroup.merged = false;
        await this.matchingRepository.save(matchingGroup);
      }
    } catch (error) {
      // Log error but don't fail the reset operation
      console.error(
        `Failed to mark group ${groupId} as unmerged:`,
        error.message,
      );
    }
  }

  private async removeContactFromDuplicateGroups(
    userId: number,
    contactId: number,
    apiKey: string,
  ) {
    try {
      // Find all matching groups that contain this contact
      const matchingGroups = await this.matchingRepository.find({
        where: { userId, apiKey },
      });

      for (const group of matchingGroups) {
        // Check if this group contains the contact
        if (group.group.includes(contactId)) {
          // Remove the contact from the group
          const updatedGroup = group.group.filter((id) => id !== contactId);

          if (updatedGroup.length < 2) {
            // If less than 2 contacts remain, delete the entire group
            await this.matchingRepository.delete({ id: group.id });
            console.log(
              `Deleted duplicate group ${group.id} - insufficient contacts after merge`,
            );
          } else {
            // Update the group with remaining contacts
            group.group = updatedGroup;
            await this.matchingRepository.save(group);
            console.log(
              `Updated duplicate group ${group.id} - removed merged contact`,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to remove contact ${contactId} from duplicate groups:`,
        error.message,
      );
      // Don't throw error as this is cleanup, shouldn't fail the merge
    }
  }
}
