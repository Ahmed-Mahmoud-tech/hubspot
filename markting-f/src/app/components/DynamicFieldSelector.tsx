'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, ChevronDown, Search } from 'lucide-react';
import useRequest from '@/app/axios/useRequest';

interface HubSpotProperty {
    name: string;
    label: string;
    description?: string;
    type: string;
    fieldType: string;
    options?: any[];
    groupName?: string;
}

interface FieldCondition {
    id: string;
    name: string;
    fields: string[];
}

interface FallbackFilterOption {
    key: string;
    label: string;
}

interface DynamicFieldSelectorProps {
    selectedConditions: FieldCondition[];
    onConditionsChange: (conditions: FieldCondition[]) => void;
    fallbackFilterOptions?: FallbackFilterOption[];
    apiKey?: string;
}

export default function DynamicFieldSelector({
    selectedConditions,
    onConditionsChange,
    fallbackFilterOptions = [],
    apiKey
}: DynamicFieldSelectorProps) {
    const { getGroupedProperties, searchProperties: searchHubspotProperties } = useRequest();
    const [properties, setProperties] = useState<HubSpotProperty[]>([]);
    const [groupedProperties, setGroupedProperties] = useState<Record<string, HubSpotProperty[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCondition, setExpandedCondition] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<HubSpotProperty[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const loadProperties = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getGroupedProperties(apiKey) as any;
            if (data.success) {
                setGroupedProperties(data.data);
                // Also set flat properties for backward compatibility
                const flatProperties = Object.values(data.data).flat() as HubSpotProperty[];
                setProperties(flatProperties);
            } else {
                throw new Error('Failed to load HubSpot properties');
            }
        } catch (err: any) {
            console.error('Failed to load HubSpot properties:', err);

            // Use fallback filter options if API fails
            if (fallbackFilterOptions.length > 0) {
                console.log('Using fallback filter options');
                const fallbackProperties: HubSpotProperty[] = fallbackFilterOptions.map(option => ({
                    name: option.key,
                    label: option.label,
                    type: 'string',
                    fieldType: 'text',
                    groupName: 'Fallback Options',
                }));

                const fallbackGrouped = {
                    'Fallback Options': fallbackProperties,
                };

                setGroupedProperties(fallbackGrouped);
                setProperties(fallbackProperties);
                setError('Using fallback options (HubSpot API unavailable)');
            } else {
                setError(err.message || 'Failed to load properties');
            }
        } finally {
            setLoading(false);
        }
    }, [fallbackFilterOptions, apiKey]);

    // Load properties when API key is available, otherwise use fallback options
    useEffect(() => {
        if (apiKey) {
            loadProperties();
        } else if (fallbackFilterOptions.length > 0) {
            // Load fallback options immediately if no API key
            const fallbackProperties: HubSpotProperty[] = fallbackFilterOptions.map(option => ({
                name: option.key,
                label: option.label,
                type: 'string',
                fieldType: 'text',
                groupName: 'Fallback Options',
            }));

            const fallbackGrouped = {
                'Fallback Options': fallbackProperties,
            };

            setGroupedProperties(fallbackGrouped);
            setProperties(fallbackProperties);
            setError('Please enter an API key to load HubSpot properties');
        }
    }, [apiKey, fallbackFilterOptions]);

    const searchProperties = useCallback(async () => {
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        try {
            const data = await searchHubspotProperties({ term: searchTerm, apiKey }) as any;
            if (data.success) {
                setSearchResults(data.data);
            }
        } catch (err: any) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm, apiKey, searchHubspotProperties]);

    // Search properties when search term changes
    useEffect(() => {
        if (searchTerm.trim()) {
            searchProperties();
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    }, [searchTerm,]);

    const addCondition = () => {
        const newCondition: FieldCondition = {
            id: `condition_${Date.now()}`,
            name: `New Condition ${selectedConditions.length + 1}`,
            fields: [],
        };
        onConditionsChange([...selectedConditions, newCondition]);
        setExpandedCondition(newCondition.id);
    };

    const removeCondition = (conditionId: string) => {
        onConditionsChange(selectedConditions.filter(c => c.id !== conditionId));
        if (expandedCondition === conditionId) {
            setExpandedCondition(null);
        }
    };

    const updateCondition = (conditionId: string, updates: Partial<FieldCondition>) => {
        onConditionsChange(
            selectedConditions.map(c =>
                c.id === conditionId ? { ...c, ...updates } : c
            )
        );
    };

    const toggleFieldInCondition = (conditionId: string, fieldName: string) => {
        const condition = selectedConditions.find(c => c.id === conditionId);
        if (!condition) return;

        const updatedFields = condition.fields.includes(fieldName)
            ? condition.fields.filter(f => f !== fieldName)
            : [...condition.fields, fieldName];

        updateCondition(conditionId, { fields: updatedFields });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2">Loading HubSpot properties...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">
                    <strong>Error:</strong> {error}
                </div>
                <button
                    type="button"
                    onClick={loadProperties}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">
                    Dynamic Field Conditions
                </h4>
                <button
                    type="button"
                    onClick={addCondition}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Condition
                </button>
            </div>

            <div className="text-sm text-gray-600">
                Create custom field combinations to detect duplicates. Each condition can combine multiple fields.
            </div>

            {/* Search functionality when condition is expanded */}
            {expandedCondition && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search HubSpot properties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    {isSearching && (
                        <div className="mt-2 text-sm text-gray-500">Searching...</div>
                    )}
                </div>
            )}

            {selectedConditions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">No custom conditions defined.</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Click &quot;Add Condition&quot; to create field combinations for duplicate detection.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {selectedConditions.map((condition) => (
                        <div
                            key={condition.id}
                            className="border border-gray-200 rounded-lg bg-white"
                        >
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={condition.name}
                                            onChange={(e) =>
                                                updateCondition(condition.id, { name: e.target.value })
                                            }
                                            className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm font-medium"
                                            placeholder="Condition name"
                                        />
                                        <div className="mt-1 text-xs text-gray-500">
                                            {condition.fields.length} field{condition.fields.length !== 1 ? 's' : ''} selected
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedCondition(
                                                    expandedCondition === condition.id ? null : condition.id
                                                )
                                            }
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transform transition-transform ${expandedCondition === condition.id ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeCondition(condition.id)}
                                            className="p-1 text-red-400 hover:text-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {expandedCondition === condition.id && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50">
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Fields to Compare:
                                        </label>
                                        <div className="text-xs text-gray-500 mb-3">
                                            Contacts will be considered duplicates if ALL selected fields match exactly.
                                        </div>
                                    </div>

                                    <div className="max-h-64 overflow-y-auto space-y-3">
                                        {searchTerm.trim() ? (
                                            // Display search results
                                            <div>
                                                <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                    Search Results ({searchResults.length})
                                                </h6>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {searchResults.map((prop) => (
                                                        <label
                                                            key={prop.name}
                                                            className="flex items-start space-x-2 p-2 rounded hover:bg-white transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={condition.fields.includes(prop.name)}
                                                                onChange={() =>
                                                                    toggleFieldInCondition(condition.id, prop.name)
                                                                }
                                                                className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {prop.label}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                    {prop.name} ({prop.type})
                                                                </div>
                                                                {prop.description && (
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        {prop.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            // Display grouped properties
                                            Object.entries(groupedProperties).map(([groupName, groupProps]) => (
                                                <div key={groupName}>
                                                    <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                                        {groupName}
                                                    </h6>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {groupProps.map((prop) => (
                                                            <label
                                                                key={prop.name}
                                                                className="flex items-start space-x-2 p-2 rounded hover:bg-white transition-colors"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={condition.fields.includes(prop.name)}
                                                                    onChange={() =>
                                                                        toggleFieldInCondition(condition.id, prop.name)
                                                                    }
                                                                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {prop.label}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 truncate">
                                                                        {prop.name} ({prop.type})
                                                                    </div>
                                                                    {prop.description && (
                                                                        <div className="text-xs text-gray-400 mt-1">
                                                                            {prop.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {condition.fields.length > 0 && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                            <div className="text-sm text-blue-800">
                                                <strong>Preview:</strong> Contacts will be marked as duplicates if they have identical values for:{' '}
                                                {condition.fields.map(field => {
                                                    const prop = properties.find(p => p.name === field);
                                                    return prop ? prop.label : field;
                                                }).join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
