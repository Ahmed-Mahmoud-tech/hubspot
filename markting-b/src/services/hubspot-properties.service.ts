import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface HubSpotProperty {
  name: string;
  label: string;
  description?: string;
  type: string;
  fieldType: string;
  options?: any[];
  groupName?: string;
}

@Injectable()
export class HubSpotPropertiesService {
  private readonly logger = new Logger(HubSpotPropertiesService.name);

  async getContactProperties(apiKey: string): Promise<HubSpotProperty[]> {
    try {
      const url = 'https://api.hubapi.com/crm/v3/properties/contacts';
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      const validProperties = data.results
        .filter((prop: any) => !prop.hidden && prop.fieldType !== 'file')
        .map((prop: any) => ({
          name: prop.name,
          label: prop.label || prop.name,
          description: prop.description,
          type: prop.type,
          fieldType: prop.fieldType,
          options: prop.options,
          groupName: this.getGroupName(prop.name),
        }));

      return validProperties;
    } catch (error: any) {
      this.logger.error('Failed to get HubSpot properties:', error.message);
      throw new Error(
        `Failed to retrieve HubSpot properties: ${error.message}`,
      );
    }
  }

  async getGroupedContactProperties(
    apiKey: string,
  ): Promise<Record<string, HubSpotProperty[]>> {
    const properties = await this.getContactProperties(apiKey);
    return properties.reduce(
      (groups, prop) => {
        const group = prop.groupName || 'Other';
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(prop);
        return groups;
      },
      {} as Record<string, HubSpotProperty[]>,
    );
  }

  async searchContactProperties(
    apiKey: string,
    searchTerm: string,
  ): Promise<HubSpotProperty[]> {
    const allProperties = await this.getContactProperties(apiKey);
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allProperties.filter(
      (prop) =>
        prop.name.toLowerCase().includes(lowerSearchTerm) ||
        prop.label.toLowerCase().includes(lowerSearchTerm) ||
        (prop.description &&
          prop.description.toLowerCase().includes(lowerSearchTerm)),
    );
  }

  async validateProperties(
    apiKey: string,
    propertyNames: string[],
  ): Promise<{ valid: string[]; invalid: string[] }> {
    try {
      const allProperties = await this.getContactProperties(apiKey);
      const validPropertyNames = allProperties.map((prop) => prop.name);
      const valid = propertyNames.filter((name) =>
        validPropertyNames.includes(name),
      );
      const invalid = propertyNames.filter(
        (name) => !validPropertyNames.includes(name),
      );
      return { valid, invalid };
    } catch (error) {
      this.logger.error('Failed to validate properties:', error);
      return { valid: [], invalid: propertyNames };
    }
  }

  private getGroupName(propertyName: string): string {
    if (['email', 'firstname', 'lastname', 'phone'].includes(propertyName)) {
      return 'Contact Information';
    }
    if (['company', 'jobtitle', 'industry'].includes(propertyName)) {
      return 'Company Information';
    }
    if (propertyName.startsWith('hs_')) {
      return 'HubSpot System';
    }
    return 'Custom Fields';
  }
}
