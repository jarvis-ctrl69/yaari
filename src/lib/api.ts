const API_URL = "http://192.168.31.159:3000";

export async function checkBackend() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

type CreateProfileData = {
  id: string;
  name: string;
  age: number;
  gender: string;
  company_email: string;
  phone: string;
  company?: string;
  job_role?: string;
  city?: string;
  interests?: string;
  bio?: string;
};

export async function createProfile(data: CreateProfileData) {
  const response = await fetch(`${API_URL}/api/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create profile");
  }

  return result.profile;
}