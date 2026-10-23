/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GigItem {
  id: string;
  title: string;
  category: 'Trades' | 'Creative' | 'Tech' | 'Events' | 'Home' | 'Delivery';
  payZar: number;
  rateType: 'fixed' | 'hourly' | 'daily';
  clientName: string;
  clientRating: number;
  area: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  description: string;
  urgency: 'immediate' | 'flexible' | 'scheduled';
  postedAt: string;
  skillsRequired: string[];
}

export type TileLayerId =
  | 'osm-standard'
  | 'carto-dark'
  | 'carto-positron'
  | 'carto-voyager'
  | 'opentopomap'
  | 'cyclosm'
  | 'esri-satellite';

export interface TileProvider {
  id: TileLayerId;
  name: string;
  category: 'Standard' | 'Minimalist' | 'Dark' | 'Outdoor' | 'Satellite';
  description: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
  requiresApiKey: false;
  badge: string;
}

export type PoiCategory =
  | 'monument'
  | 'nature'
  | 'city'
  | 'culture'
  | 'transport'
  | 'custom';

export interface MarkerItem {
  id: string;
  title: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  description?: string;
  color?: string;
  icon?: string;
  address?: string;
  createdAt?: string;
  isCustom?: boolean;
}

export type ActiveTool =
  | 'explore'
  | 'add-pin'
  | 'measure-distance'
  | 'measure-area'
  | 'route';

export interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  category: string;
  importance?: number;
  address?: Record<string, string>;
  boundingbox?: [string, string, string, string];
}

export type RouteMode = 'driving' | 'cycling' | 'walking';

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng]
  distanceKm: number;
  durationMinutes: number;
  mode: RouteMode;
  steps: RouteStep[];
  originName: string;
  destinationName: string;
}

export interface MeasurementState {
  points: [number, number][]; // [lat, lng]
  totalDistanceMeters: number;
  enclosedAreaSqMeters: number;
}

export interface WorkExperience {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface WorkReference {
  name: string;
  contact: string;
  relation: string;
}

export const CASUAL_TRADES = [
  // Cleaning & Home
  'General Cleaning',
  'House Sitting',
  'Laundry & Ironing',
  'Window Cleaning',
  'Gutter Cleaning',
  'Carpet Cleaning',
  'Decluttering & Organizing',
  'Pool Cleaning',
  'Sanitizing / Disinfecting',
  
  // Outdoor & Maintenance
  'Gardening & Landscaping',
  'Painting & Decorating',
  'Handyman / General Repairs',
  'Furniture Assembly',
  'Tiling',
  'Plumbing (Basic)',
  'Electrical (Basic)',
  'Roof Repair (Basic)',
  'Fence Repair',
  'Pest Control (Basic)',
  
  // Automotive
  'Car Washing & Detailing',
  'Car Repair (Basic)',
  'Bicycle Repair',
  'Tyre Change / Repair',
  
  // Logistics & Help
  'Delivery & Courier',
  'Grocery Shopping',
  'Moving Help / Lifting',
  'Packing & Unpacking',
  'Personal Shopper',
  
  // Care & Pets
  'Pet Sitting & Walking',
  'Dog Grooming',
  'Baby Sitting & Childcare',
  'Elderly Care / Companion',
  
  // Events & Hospitality
  'Event Assistance / Waitron',
  'Waitron / Server',
  'Kitchen Hand',
  'Dishwashing',
  'Bartender',
  'Catering Assistance',
  'Baking',
  'Cook / Personal Chef',
  'Event Setup / Decor',
  'DJ',
  'MC / Host',
  'Security Guard (Freelance)',
  'Bouncer',
  'Parking Marshall',
  
  // Creative & Tech
  'Photography',
  'Video Editing',
  'Graphic Design (Freelance)',
  'Social Media Content Creation',
  'Social Media Management',
  'Basic Web Help',
  'IT Support',
  'Phone Repair',
  'Data Entry',
  'Transcription',
  'Translation',
  'Voice Over',
  'Actor / Extra',
  'Model',
  
  // Education & Professional
  'Tutoring',
  'Personal Trainer',
  'Yoga Instructor',
  'Dance Teacher',
  'Music Teacher',
  'Art Teacher',
  'Personal Assistant',
  
  // Marketing & Sales
  'Flyer Distribution',
  'Street Marketing',
  'Promoter',
  'Brand Ambassador',
  'Survey Taker',
  'Mystery Shopper',
  
  // Beauty & Craft
  'Makeup Artist',
  'Hair Braiding',
  'Manicure & Pedicure',
  'Massage Therapist',
  'Tailoring / Sewing',
  'Jewelry Making',
  'Woodworking',
  
  // Farming
  'Farm Hand',
  'Fruit Picking',
] as const;

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  surname: string;
  dateOfBirth?: string;
  contactNumber?: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  socialLinks?: { platform: string; url: string }[];
  profilePictureUrl?: string;
  selfieUrl?: string;
  idDocumentUrl?: string;
  proofOfPaymentUrl?: string;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  trades?: string[];
  experience?: WorkExperience[];
  references?: WorkReference[];
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  subscriptionPlan?: 'none' | 'tenant' | 'user';
  requestedPlan?: 'none' | 'tenant' | 'user';
  referredBy?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
  updatedAtServer?: any;
}
