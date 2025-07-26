import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matching } from '../entities/matching.entity';
import { ContactService } from './contact.service';

@Injectable()
export class DuplicateDetectionService {
  // Find duplicates by first & last name
  private async findFirstLastNameDuplicates(
    apiKey: string,
    userId: number,
  ): Promise<any[]> {
    return this.matchingRepository.query(
      `
      SELECT first_name, last_name, array_agg(id) as contact_ids, count(*) as count
      FROM contacts
      WHERE "api_key" = $1 AND "user_id" = $2
        AND first_name IS NOT NULL AND first_name != ''
        AND last_name IS NOT NULL AND last_name != ''
      GROUP BY first_name, last_name
      HAVING count(*) > 1
      `,
      [apiKey, userId],
    );
  }

  // Find duplicates by first name & phone
  private async findFirstNamePhoneDuplicates(
    apiKey: string,
    userId: number,
  ): Promise<any[]> {
    return this.matchingRepository.query(
      `
      SELECT first_name, phone, array_agg(id) as contact_ids, count(*) as count
      FROM contacts
      WHERE "api_key" = $1 AND "user_id" = $2
        AND first_name IS NOT NULL AND first_name != ''
        AND phone IS NOT NULL AND phone != ''
      GROUP BY first_name, phone
      HAVING count(*) > 1
      `,
      [apiKey, userId],
    );
  }
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    @InjectRepository(Matching)
    private matchingRepository: Repository<Matching>,
    private contactService: ContactService,
  ) {}

  async findAndSaveDuplicates(
    apiKey: string,
    userId: number,
    filters?: string[],
  ): Promise<void> {
    this.logger.log('Starting SQL-based duplicate detection process...');

    // Get total count first
    const totalCount = await this.contactService.getContactCount(
      userId,
      apiKey,
    );

    this.logger.log(`Found ${totalCount} contacts to analyze for duplicates`);

    const duplicateGroups: number[][] = [];
    const processedContacts = new Set<number>();

    // Always check for same_email (hidden default)
    if (!filters || filters.includes('same_email')) {
      this.logger.log('Finding email duplicates using SQL...');
      const emailDuplicates = await this.findEmailDuplicates(apiKey, userId);
      for (const group of emailDuplicates) {
        const contactIds = group.contact_ids;
        duplicateGroups.push(contactIds);
        contactIds.forEach((id: number) => processedContacts.add(id));
        this.logger.log(
          `Found email duplicate group: ${contactIds.length} contacts with email "${group.email}"`,
        );
      }
      this.logger.log(`Found ${emailDuplicates.length} email duplicate groups`);
    }

    if (!filters || filters.includes('phone')) {
      this.logger.log('Finding phone duplicates using SQL...');
      const phoneDuplicates = await this.findPhoneDuplicates(apiKey, userId);
      for (const group of phoneDuplicates) {
        const contactIds = group.contact_ids;
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );
        if (unprocessedIds.length > 1) {
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found phone duplicate group: ${unprocessedIds.length} contacts with phone "${group.phone}"`,
          );
        } else if (unprocessedIds.length === 1) {
          const existingGroupIndex = duplicateGroups.findIndex(
            (existingGroup) =>
              contactIds.some((id: number) => existingGroup.includes(id)),
          );
          if (existingGroupIndex >= 0) {
            duplicateGroups[existingGroupIndex].push(unprocessedIds[0]);
            processedContacts.add(unprocessedIds[0]);
            this.logger.log(
              `Merged contact ${unprocessedIds[0]} with existing group by phone`,
            );
          }
        }
      }
      this.logger.log(`Processed ${phoneDuplicates.length} phone groups`);
    }

    if (!filters || filters.includes('first_last_name')) {
      this.logger.log('Finding first & last name duplicates using SQL...');
      const nameDuplicates = await this.findFirstLastNameDuplicates(
        apiKey,
        userId,
      );
      for (const group of nameDuplicates) {
        const contactIds = group.contact_ids;
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );
        if (unprocessedIds.length > 1) {
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found first & last name duplicate group: ${unprocessedIds.length} contacts with name "${group.first_name} ${group.last_name}"`,
          );
        }
      }
    }

    if (!filters || filters.includes('first_name_phone')) {
      this.logger.log('Finding first name & phone duplicates using SQL...');
      const namePhoneDuplicates = await this.findFirstNamePhoneDuplicates(
        apiKey,
        userId,
      );
      for (const group of namePhoneDuplicates) {
        const contactIds = group.contact_ids;
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );
        if (unprocessedIds.length > 1) {
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found first name & phone duplicate group: ${unprocessedIds.length} contacts with name "${group.first_name}" and phone "${group.phone}"`,
          );
        }
      }
    }

    if (!filters || filters.includes('first_last_name_company')) {
      this.logger.log('Finding name+company duplicates using SQL...');
      const nameCompanyDuplicates = await this.findNameCompanyDuplicates(
        apiKey,
        userId,
      );
      for (const group of nameCompanyDuplicates) {
        const contactIds = group.contact_ids;
        const unprocessedIds = contactIds.filter(
          (id: number) => !processedContacts.has(id),
        );
        if (unprocessedIds.length > 1) {
          duplicateGroups.push(unprocessedIds);
          unprocessedIds.forEach((id: number) => processedContacts.add(id));
          this.logger.log(
            `Found name+company duplicate group: ${unprocessedIds.length} contacts with name "${group.first_name} ${group.last_name}" at "${group.company}"`,
          );
        }
      }
      this.logger.log(
        `Processed ${nameCompanyDuplicates.length} name+company groups`,
      );
    }

    // Filter out any groups that somehow ended up with only 1 contact
    const validGroups = duplicateGroups.filter((group) => group.length > 1);

    this.logger.log(
      `Completed SQL-based duplicate detection. Found ${validGroups.length} total duplicate groups containing ${processedContacts.size} duplicate contacts out of ${totalCount} total contacts`,
    );

    // Save duplicate groups
    await this.saveDuplicateGroups(validGroups, apiKey, userId);
  }

  private async findEmailDuplicates(
    apiKey: string,
    userId: number,
  ): Promise<any[]> {
    return this.matchingRepository.query(
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
  }

  private async findPhoneDuplicates(
    apiKey: string,
    userId: number,
  ): Promise<any[]> {
    return this.matchingRepository.query(
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
  }

  private async findNameCompanyDuplicates(
    apiKey: string,
    userId: number,
  ): Promise<any[]> {
    return this.matchingRepository.query(
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
  }

  private async saveDuplicateGroups(
    validGroups: number[][],
    apiKey: string,
    userId: number,
  ): Promise<void> {
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
          `Successfully saved ${validGroups.length} duplicate groups to matching table as separate rows`,
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
  }

  async clearExistingMatches(userId: number, apiKey: string): Promise<void> {
    await this.matchingRepository.delete({ userId, apiKey });
    this.logger.log(
      `Cleared existing matching data for user ${userId} with API key ${apiKey}`,
    );
  }
}
