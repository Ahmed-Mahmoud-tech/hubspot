import useApi from "./useApi";
import { getCookie } from "cookies-next";

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string[];
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  verified: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface HubSpotPropertyOption {
  label: string;
  value: string;
  description?: string;
  displayOrder: number;
  hidden: boolean;
}

export interface HubSpotProperty {
  name: string;
  label: string;
  description: string;
  type: string;
  fieldType: string;
  options: HubSpotPropertyOption[];
  groupName: string;
}

export interface HubSpotPropertiesResponse {
  success: boolean;
  properties: HubSpotProperty[];
}

const useRequest = () => {
  // Get latest action for a given apiKey
  const getLatestAction = async (apiKey: string) => {
    return await Request.get(`/hubspot/latest-action/${apiKey}`);
  };
  const Request = useApi();

  // Utility and merge-related methods
  const resetMerge = async (groupId: number) => {
    return await Request.post(`/hubspot/reset-merge`, { groupId });
  };

  const removeContact = async (contactId: number) => {
    return await Request.delete(`/hubspot/remove-contact/${contactId}`);
  };

  const mergeContacts = async (data: any) => {
    return await Request.post(`/hubspot/merge-contacts`, data);
  };

  const bulkMergeGroups = async (data: any) => {
    return await Request.post(`/hubspot/bulk-merge-groups`, data);
  };

  const resetMergeByGroup = async (groupId: number) => {
    return await Request.post(`/hubspot/reset-merge-by-group`, { groupId });
  };

  const resetAllPendingMerges = async () => {
    return await Request.post(`/hubspot/reset-all-pending-merges`);
  };

  const finishProcess = async (data?: any) => {
    return await Request.post(`/hubspot/finish`, data);
  };

  const getActions = async (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url =
      params && (params.page || params.limit)
        ? `/hubspot/actions?${queryParams.toString()}`
        : "/hubspot/actions";

    const response = await Request.get(url);
    return response.data;
  };

  const finalDeleteActionById = async (actionId: number, apiKey: string) => {
    try {
      const response = await Request({
        method: "PUT",
        url: "/hubspot/delete-action",
        data: { actionId, apiKey },
      });
      return response.data;
    } catch (error: any) {
      // Check if it's a 404 error and enhance the error message
      if (error.response?.status === 404) {
        const enhancedError = {
          ...error,
          message: "Delete endpoint not implemented",
          response: error.response,
        };
        throw enhancedError;
      }
      // Re-throw other errors as-is
      throw error;
    }
  };

  const getRemovalHistory = async () => {
    return await Request.get(`/hubspot/removal-history`);
  };

  const undoRemoval = async (removalId: number) => {
    return await Request.post(`/hubspot/undo-removal`, { removalId });
  };

  const getProcessProgress = async () => {
    return await Request.get(`/hubspot/process-progress`);
  };

  const deleteActionById = async (actionId: number) => {
    return await Request.delete(`/hubspot/actions/${actionId}`);
  };

  // Store methods
  const updateStore = async (id: string, body: Record<string, unknown>) => {
    return await Request.put(`stores/${id}`, body);
  };

  // Auth methods
  const register = async (data: RegisterData): Promise<{ message: string }> => {
    const response = await Request.post("/auth/register", data);
    return response.data as { message: string };
  };

  // Get current user's plan
  const getUserPlan = async () => {
    const response = await Request.get("/plans/user");
    return response.data;
  };

  // Get user's current balance
  const getUserBalance = async () => {
    const response = await Request.get("/plans/balance");
    return response.data;
  };

  // Get paginated payments for the current user
  const getUserPayments = async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `/plans/payments${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const response = await Request.get(url);
    return response.data;
  };

  // Calculate upgrade pricing with balance
  const calculateUpgradePrice = async (data: {
    contactCount: number;
    billingType: "monthly" | "yearly";
  }) => {
    const response = await Request.post("/plans/upgrade-price", data);
    return response.data;
  };

  // HubSpot integration methods
  const startHubSpotFetch = async (data: {
    name: string;
    apiKey: string;
    filters: string[];
    properties?: string[];
    fromDate?: string;
    toDate?: string;
  }): Promise<{ message: string; actionId: number; status: string }> => {
    const response = await Request.post("/hubspot/start-fetch", data);
    return response.data as {
      message: string;
      actionId: number;
      status: string;
    };
  };

  const getHubSpotProperties = async (apiKey: string): Promise<string[]> => {
    try {
      const response = await Request.get(
        `/hubspot/properties?apiKey=${encodeURIComponent(apiKey)}`
      );

      // Handle the actual response structure from HubSpot API
      const responseData = response.data;

      // HubSpot API returns: { results: [{ name, label, ... }, ...] }
      if (
        responseData &&
        typeof responseData === "object" &&
        "results" in responseData &&
        Array.isArray(responseData.results)
      ) {
        // Extract property names from the HubSpot API response structure
        return responseData.results.map((property: any) => property.name);
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "success" in responseData &&
        "properties" in responseData
      ) {
        // Handle custom wrapped response format if backend changes
        const properties = (responseData as any).properties;
        if (Array.isArray(properties)) {
          return properties.map((property: any) => property.name);
        }
      } else if (Array.isArray(responseData)) {
        // Fallback for simple array response
        return responseData;
      }

      console.error("Unexpected response format:", responseData);
      throw new Error(
        "Invalid response format: expected HubSpot properties response"
      );
    } catch (error: any) {
      console.error("Error fetching HubSpot properties:", error);
      throw new Error(error?.message || "Failed to fetch HubSpot properties");
    }
  };

  const getHubSpotPropertiesWithDetails = async (
    apiKey: string
  ): Promise<HubSpotProperty[]> => {
    try {
      const response = await Request.get(
        `/hubspot/properties?apiKey=${encodeURIComponent(apiKey)}`
      );

      // Handle the actual response structure from HubSpot API
      const responseData = response.data;

      // HubSpot API returns: { results: [{ name, label, ... }, ...] }
      if (
        responseData &&
        typeof responseData === "object" &&
        "results" in responseData &&
        Array.isArray(responseData.results)
      ) {
        // Return the full property objects from the HubSpot API response
        return responseData.results;
      } else if (
        responseData &&
        typeof responseData === "object" &&
        "success" in responseData &&
        "properties" in responseData
      ) {
        // Handle custom wrapped response format if backend changes
        const properties = (responseData as any).properties;
        if (Array.isArray(properties)) {
          return properties;
        }
      } else if (Array.isArray(responseData)) {
        // Fallback for array of property objects
        return responseData;
      }

      console.error("Unexpected response format:", responseData);
      throw new Error(
        "Invalid response format: expected HubSpot properties response"
      );
    } catch (error: any) {
      console.error("Error fetching HubSpot properties with details:", error);
      throw new Error(
        error?.message || "Failed to fetch HubSpot properties with details"
      );
    }
  };

  const getDuplicates = async (params: {
    apiKey: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append("apiKey", params.apiKey);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    const response = await Request.get(
      `/hubspot/duplicates?${queryParams.toString()}`
    );
    return response.data;
  };

  const submitMerge = async (data: {
    groupId: number;
    selectedContactId: number;
    selectedContactHubspotId: string;
    updatedData: Record<string, string>;
    removedIds: number[];
    allContactsData: any[];
    apiKey: string;
  }) => {
    const response = await Request.post("/hubspot/submit-merge", data);
    return response.data;
  };

  const updateContact = async (data: {
    contactId: string;
    apiKey: string;
    fields: {
      firstname?: string;
      lastname?: string;
      phone?: string;
      company?: string;
    };
  }) => {
    const response = await Request.post("/hubspot/update-contact", data);
    return response.data;
  };

  // Stripe payment verification
  const verifyStripeSession = async ({
    sessionId,
    apiKey,
  }: {
    sessionId: string;
    apiKey: string;
  }) => {
    const response = await Request.post("/stripe/verify-session", {
      session_id: sessionId,
      apiKey,
    });
    return response.data;
  };
  // Stripe payment
  const createStripeCheckoutSession = async (data: {
    planType: string;
    contactCount: number;
    userId: number;
    billingType: string;
    apiKey?: string;
  }) => {
    const response = await Request.post(
      "/stripe/create-checkout-session",
      data
    );
    return response.data;
  };

  // Authentication utility functions
  const isAuthenticated = (): boolean => {
    const token = getCookie("auth_token");
    return !!token;
  };

  const getCurrentUser = () => {
    const userCookie = getCookie("user");
    if (userCookie) {
      try {
        return JSON.parse(userCookie as string);
      } catch {
        return null;
      }
    }
    return null;
  };

  const verifyEmail = async (token: string): Promise<{ message: string }> => {
    const response = await Request.get(`/auth/verify-email?token=${token}`);
    return response.data as { message: string };
  };

  const login = async (data: LoginData): Promise<AuthResponse> => {
    const response = await Request.post("/auth/login", data);
    return response.data as AuthResponse;
  };

  const forgotPassword = async (
    data: ForgotPasswordData
  ): Promise<{ message: string }> => {
    const response = await Request.post("/auth/forgot-password", data);
    return response.data as { message: string };
  };

  const resetPassword = async (
    data: ResetPasswordData
  ): Promise<{ message: string }> => {
    const response = await Request.post("/auth/reset-password", data);
    return response.data as { message: string };
  };

  const getProfile = async (): Promise<User> => {
    const response = await Request.get("/auth/profile");
    return response.data as User;
  };

  const resendVerificationEmail = async (data: {
    email: string;
  }): Promise<{ message: string }> => {
    const response = await Request.post("/auth/resend-verification", data);
    return response.data as { message: string };
  };

  // Create user plan (free or paid)
  const createUserPlan = async (data: {
    planType: string;
    contactCount: number;
    apiKey?: string;
    activationDate?: string;
    paymentStatus?: string;
  }) => {
    // Adjust the endpoint and payload as needed to match your backend
    const response = await Request.post("/plans/create", data);
    return response.data;
  };

  // OAuth HubSpot integration methods
  const startHubSpotOAuthFetch = async (data: {
    name: string;
    filters: string[];
    properties?: string[];
    fromDate?: string;
    toDate?: string;
  }): Promise<{ message: string; actionId: number; status: string }> => {
    const response = await Request.post("/hubspot/start-fetch-oauth", data);
    return response.data as {
      message: string;
      actionId: number;
      status: string;
    };
  };

  const getHubSpotOAuthStatus = async () => {
    const response = await Request.get("/hubspot/oauth/status");
    return response.data as {
      success: boolean;
      connected: boolean;
      accountName?: string;
      portalId?: number;
      lastUsed?: string;
    };
  };

  const disconnectHubSpot = async () => {
    const response = await Request.get("/hubspot/oauth/disconnect");
    return response.data as {
      success: boolean;
      message: string;
    };
  };

  const initiateHubSpotOAuth = async () => {
    const response = await Request.get("/hubspot/oauth/authorize");
    return response.data as {
      success: boolean;
      authUrl?: string;
      message?: string;
    };
  };

  const getHubSpotPropertiesOAuth = async (): Promise<string[]> => {
    try {
      const response = await Request.get("/hubspot/properties-oauth");

      const responseData = response.data;

      if (
        responseData &&
        typeof responseData === "object" &&
        "results" in responseData &&
        Array.isArray(responseData.results)
      ) {
        return responseData.results.map((property: any) => property.name);
      } else if (Array.isArray(responseData)) {
        return responseData;
      }

      throw new Error(
        "Invalid response format: expected HubSpot properties response"
      );
    } catch (error: any) {
      console.error("Error fetching HubSpot properties:", error);
      throw new Error(error?.message || "Failed to fetch HubSpot properties");
    }
  };

  // ...existing code...

  return {
    createStripeCheckoutSession,
    verifyStripeSession,
    updateStore,
    register,
    verifyEmail,
    login,
    forgotPassword,
    resetPassword,
    resendVerificationEmail,
    getProfile,
    isAuthenticated,
    getCurrentUser,
    getUserPlan,
    getUserBalance,
    calculateUpgradePrice,
    startHubSpotFetch,
    startHubSpotOAuthFetch,
    getHubSpotOAuthStatus,
    disconnectHubSpot,
    initiateHubSpotOAuth,
    getHubSpotProperties,
    getHubSpotPropertiesOAuth,
    getHubSpotPropertiesWithDetails,
    getDuplicates,
    submitMerge,
    updateContact,
    resetMerge,
    removeContact,
    mergeContacts,
    bulkMergeGroups,
    resetMergeByGroup,
    resetAllPendingMerges,
    finishProcess,
    getActions,
    getUserPayments,
    getLatestAction,
    getRemovalHistory,
    undoRemoval,
    getProcessProgress,
    deleteActionById,
    finalDeleteActionById,
    createUserPlan,
  };
};

export default useRequest;
