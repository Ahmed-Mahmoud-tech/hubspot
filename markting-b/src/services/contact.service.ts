import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Contact } from '../entities/contact.entity';

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

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async saveContacts(
    hubspotContacts: HubSpotContact[],
    apiKey: string,
    userId: number,
  ): Promise<void> {
    this.logger.log(`Saving ${hubspotContacts.length} contacts from HubSpot`);
    
    const contactEntities = hubspotContacts.map((hsContact) => ({
      hubspotId: hsContact.id,
      email: hsContact.properties.email || undefined,
      firstName: hsContact.properties.firstname || undefined,
      lastName: hsContact.properties.lastname || undefined,
      phone: hsContact.properties.phone || undefined,
      company: hsContact.properties.company || undefined,
      hs_additional_emails:
        hsContact.properties.hs_additional_emails || undefined,
      createDate: hsContact.properties.createdate
        ? new Date(hsContact.properties.createdate)
        : undefined,
      lastModifiedDate: hsContact.properties.lastmodifieddate
        ? new Date(hsContact.properties.lastmodifieddate)
        : undefined,
      // Store all properties as JSON for dynamic field detection
      properties: JSON.stringify(hsContact.properties),
      apiKey,
      user: { id: userId },
    }));

    // Log a sample of the data being saved
    if (contactEntities.length > 0) {
      this.logger.log(
        'Sample contact properties:',
        JSON.stringify(JSON.parse(contactEntities[0].properties), null, 2),
      );
    }

    // Use save with upsert option to handle potential duplicates
    await this.contactRepository.save(contactEntities, { chunk: 50 });
    this.logger.log(`Successfully saved ${contactEntities.length} contacts`);
  }

  async getContactCount(userId: number, apiKey: string): Promise<number> {
    return this.contactRepository.count({
      where: { user: { id: userId }, apiKey },
    });
  }

  async getAllContacts(userId: number, apiKey: string): Promise<Contact[]> {
    return this.contactRepository.find({
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
        'hs_additional_emails',
      ],
    });
  }

  async getContactsByIds(contactIds: number[]): Promise<Contact[]> {
    return this.contactRepository.find({
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
        'hs_additional_emails',
      ],
    });
  }

  async getContactById(contactId: number): Promise<Contact | null> {
    return this.contactRepository.findOne({
      where: { id: contactId },
    });
  }

  async deleteContactsByApiKey(apiKey: string): Promise<void> {
    await this.contactRepository.delete({ apiKey });
    this.logger.log(`Deleted all contacts for API key ${apiKey}`);
  }

  async clearContactsByApiKey(userId: number, apiKey: string): Promise<void> {
    await this.contactRepository.delete({
      user: { id: userId },
      apiKey,
    });
    this.logger.log(
      `Cleared all contacts for user ${userId} and API key ${apiKey}`,
    );
  }

  async getContactsForDuplicateAnalysis(
    userId: number,
    apiKey: string,
  ): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { apiKey, user: { id: userId } },
      select: [
        'id',
        'email',
        'phone',
        'firstName',
        'lastName',
        'company',
        'hs_additional_emails',
      ],
    });
  }

  async updateContactByHubspotId(
    hubspotId: string,
    fields: Partial<Contact>,
  ): Promise<void> {
    await this.contactRepository.update({ hubspotId }, fields);
    this.logger.log(`Updated contact in local DB with hubspotId ${hubspotId}`);
  }
}
