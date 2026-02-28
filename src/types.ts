export interface Agent {
  id: string;
  name: string;
  type: 'phone' | 'whatsapp' | 'voice_blaster';
  gender: 'Male' | 'Female';
  lastEdited: string;
  created: string;
}

export interface PhoneNumber {
  id: string;
  type: 'phone' | 'whatsapp';
  provider: 'Twilio' | 'Plivo' | 'Telnyx';
  number: string;
  sid?: string;
  token: string;
  inboundAgentId?: string;
  outboundAgentId?: string;
  verified: number; // 0 or 1
  verifiedAt?: string;
  created: string;
}

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  status: 'processed' | 'processing' | 'failed';
  created: string;
}

export interface CallLog {
  id: string;
  campaignId: string;
  phoneNumber: string;
  status: 'queued' | 'completed' | 'failed';
  duration: number;
  attemptedTime: string;
  created: string;
}

export interface Campaign {
  id: string;
  name: string;
  leads: number;
  attempted: number;
  connected: number;
  status: 'completed' | 'failed' | 'frozen' | 'running';
  startTime?: string;
  endTime?: string;
  callingDays?: string;
  timezone?: string;
  created: string;
  lastRan: string;
  logs?: CallLog[];
}
