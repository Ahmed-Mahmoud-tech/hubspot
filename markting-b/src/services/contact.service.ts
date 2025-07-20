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

  async getContactsForDuplicateAnalysis(
    userId: number,
    apiKey: string,
  ): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { apiKey, user: { id: userId } },
      select: ['id', 'email', 'phone', 'firstName', 'lastName', 'company'],
    });
  }
}
