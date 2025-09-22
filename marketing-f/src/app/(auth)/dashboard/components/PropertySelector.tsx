'use client';

import { useState } from 'react';
import { Search, Settings, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface PropertySelectorProps {
    selectedProperties: string[];
    setSelectedProperties: (properties: string[]) => void;
    availableProperties: string[];
    customPropsSearch: string;
    setCustomPropsSearch: (search: string) => void;
}

export default function PropertySelector({
    selectedProperties,
    setSelectedProperties,
    availableProperties,
    customPropsSearch,
    setCustomPropsSearch,
}: PropertySelectorProps) {
    const [showCustomProperties, setShowCustomProperties] = useState(false);

    const handlePropertyToggle = (property: string) => {
        if (selectedProperties.includes(property)) {
            setSelectedProperties(selectedProperties.filter(p => p !== property));
        } else {
            setSelectedProperties([...selectedProperties, property]);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Settings className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900">HubSpot Properties to Fetch</h4>
                        <p className="text-sm text-gray-600">Select which contact properties to retrieve from HubSpot</p>
                    </div>
                    <div className="ml-auto">
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                            {selectedProperties.length} selected
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Selected Properties Summary */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-900">Selected Properties</h5>
                            <p className="text-sm text-gray-600">Properties that will be fetched from HubSpot</p>
                        </div>
                    </div>

                    {selectedProperties.length > 0 ? (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-wrap gap-2">
                                {selectedProperties.map(property => (
                                    <span
                                        key={property}
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                                    >
                                        {property}
                                        <button
                                            type="button"
                                            onClick={() => handlePropertyToggle(property)}
                                            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-700">
                                No properties selected. Please select properties from the available options below.
                            </p>
                        </div>
                    )}
                </div>

                {/* Available Properties Section */}
                {availableProperties.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="font-medium text-gray-900">Available Properties</h5>
                                <p className="text-sm text-gray-600">Select properties from your HubSpot account</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCustomProperties(!showCustomProperties)}
                                className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                                {showCustomProperties ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Hide Properties
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        Show Properties ({availableProperties.length})
                                    </>
                                )}
                            </button>
                        </div>

                        {showCustomProperties && (
                            <div className="space-y-4">
                                {/* Search Properties */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={customPropsSearch}
                                        onChange={e => setCustomPropsSearch(e.target.value)}
                                        placeholder="Search properties..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                {availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase())).length > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            {availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase())).length} properties available
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const filteredProps = availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase()));
                                                const allFilteredSelected = filteredProps.every(prop => selectedProperties.includes(prop));

                                                if (allFilteredSelected) {
                                                    // Remove all filtered properties
                                                    setSelectedProperties(selectedProperties.filter(prop => !filteredProps.includes(prop)));
                                                } else {
                                                    // Add all filtered properties
                                                    const newSelected = [...new Set([...selectedProperties, ...filteredProps])];
                                                    setSelectedProperties(newSelected);
                                                }
                                            }}
                                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                                        >
                                            {availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase())).every(prop => selectedProperties.includes(prop))
                                                ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                )}

                                <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                                    {availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase())).length > 0 ? (
                                        <div className="divide-y divide-gray-200">
                                            {availableProperties.filter(p => p.toLowerCase().includes(customPropsSearch.toLowerCase())).map(property => (
                                                <label key={property} className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProperties.includes(property)}
                                                        onChange={() => handlePropertyToggle(property)}
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                    />
                                                    <span className="text-sm text-gray-700 font-medium">{property}</span>
                                                    {selectedProperties.includes(property) && (
                                                        <Check className="w-4 h-4 text-green-600 ml-auto" />
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            {customPropsSearch ? 'No properties match your search' : 'No properties available'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary Section */}
                {selectedProperties.length > 0 && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <div className="w-5 h-5 text-blue-600 mt-0.5">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-800">Property Selection Summary</p>
                                <p className="text-sm text-blue-700">
                                    {selectedProperties.length} properties will be fetched from HubSpot contacts.
                                    This includes contact data that will be used for duplicate detection and export.
                                </p>
                                {selectedProperties.length > 50 && (
                                    <p className="text-sm text-orange-700 mt-1">
                                        ⚠️ Selecting many properties may increase processing time.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedProperties.length === 0 && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <div className="w-5 h-5 text-yellow-600 mt-0.5">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-yellow-800">No Properties Selected</p>
                                <p className="text-sm text-yellow-700">
                                    Please select at least one property to fetch from HubSpot contacts.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
