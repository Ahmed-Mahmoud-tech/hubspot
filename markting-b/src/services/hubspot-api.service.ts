import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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
export class HubSpotApiService {
  private readonly logger = new Logger(HubSpotApiService.name);

  async makeHubSpotAPIRequest(
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

  async validateApiKey(apiKey: string): Promise<void> {
    try {
      await this.makeHubSpotAPIRequest(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        apiKey,
        { limit: 1 },
      );
      this.logger.log('API key validation successful');
    } catch (error) {
      this.logger.error('API key validation failed:', error.message);
      throw new Error(
        'Invalid API key or HubSpot API error. Please check your HubSpot API key and try again.',
      );
    }
  }

  async fetchContactsPage(
    apiKey: string,
    after?: string,
    limit: number = 100,
  ): Promise<HubSpotListResponse> {
    const properties = [
      'firstname',
      'lastname',
      'email',
      'phone',
      'company',
    ].join(',');

    const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=${properties}`;

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

    const response = await this.makeHubSpotAPIRequest(url, apiKey, params);
    return response.data as HubSpotListResponse;
  }

  async updateHubSpotContact(
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

      const url = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}`;

      await axios.patch(
        url,
        { properties },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Updated contact ${hubspotId} in HubSpot`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to update HubSpot contact ${hubspotId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteHubSpotContact(
    hubspotId: string,
    apiKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}`;

      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Deleted contact ${hubspotId} from HubSpot`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to delete HubSpot contact ${hubspotId}:`,
        error.message,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async mergeHubSpotContacts(
    primaryContactId: string,
    secondaryContactId: string,
    apiKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const mergeUrl = `https://api.hubapi.com/crm/v3/objects/contacts/merge`;

      const mergePayload = {
        primaryObjectId: primaryContactId,
        objectIdToMerge: secondaryContactId,
      };

      this.logger.log(
        `Starting HubSpot merge: ${primaryContactId} <- ${secondaryContactId}`,
      );
      this.logger.log(`Merge URL: ${mergeUrl}`);
      this.logger.log(`Merge payload: ${JSON.stringify(mergePayload)}`);

      const response = await axios.post(mergeUrl, mergePayload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`HubSpot merge API response status: ${response.status}`);
      this.logger.log(
        `HubSpot merge API response data: ${JSON.stringify(response.data)}`,
      );

      this.logger.log(
        `Successfully merged HubSpot contacts: ${primaryContactId} <- ${secondaryContactId}`,
      );

      return {
        success: true,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to merge HubSpot contacts ${primaryContactId} <- ${secondaryContactId}:`,
        error.response?.data || error.message,
      );
      
      // Log more details about the error
      if (error.response) {
        this.logger.error(`HTTP Status: ${error.response.status}`);
        this.logger.error(`Error Data: ${JSON.stringify(error.response.data)}`);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}
