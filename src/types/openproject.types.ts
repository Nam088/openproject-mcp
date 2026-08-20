export interface HalLink {
  href: string;
  title?: string;
  method?: string;
  type?: string;
  templated?: boolean;
}

export interface HalResource {
  _type?: string;
  _links?: Record<string, HalLink | HalLink[] | undefined>;
  _embedded?: Record<string, unknown>;
}

export interface HalCollection<T> extends HalResource {
  _type: 'Collection';
  total: number;
  count: number;
  pageSize: number;
  offset: number;
  _embedded: {
    elements: T[];
    [key: string]: unknown;
  };
}

export interface OpenProjectWorkPackage extends HalResource {
  id: number;
  subject: string;
  lockVersion: number;
  description?: {
    format: 'markdown' | 'plain' | 'custom';
    raw?: string;
    html?: string;
  };
  startDate?: string | null;
  dueDate?: string | null;
  estimatedTime?: string | null;
  remainingTime?: string | null;
  spentTime?: string | null;
  percentageDone?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenProjectProject extends HalResource {
  id: number;
  identifier: string;
  name: string;
  active: boolean;
  public: boolean;
  description?: {
    format: 'markdown' | 'plain';
    raw?: string;
    html?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenProjectTimeEntry extends HalResource {
  id: number;
  hours: string;
  spentOn: string;
  comment?: {
    format: 'markdown' | 'plain';
    raw?: string;
    html?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenProjectRelation extends HalResource {
  id: number;
  type: string;
  name?: string;
  reverseType?: string;
  description?: string;
  delay?: number;
}

export interface OpenProjectStatus extends HalResource {
  id: number;
  name: string;
  isClosed: boolean;
  isDefault: boolean;
  isReadonly: boolean;
  color?: string;
}

export interface OpenProjectType extends HalResource {
  id: number;
  name: string;
  color?: string;
  position?: number;
  isDefault?: boolean;
  isMilestone?: boolean;
}

export interface OpenProjectPriority extends HalResource {
  id: number;
  name: string;
  isDefault: boolean;
  position?: number;
  color?: string;
}

export interface OpenProjectUser extends HalResource {
  id: number;
  name: string;
  login?: string;
  email?: string;
  status?: string;
  admin?: boolean;
}

export interface OpenProjectGroup extends HalResource {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenProjectVersion extends HalResource {
  id: number;
  name: string;
  status: 'open' | 'locked' | 'closed';
  startDate?: string;
  endDate?: string;
  description?: {
    format: 'markdown' | 'plain';
    raw?: string;
  };
}

export interface OpenProjectCategory extends HalResource {
  id: number;
  name: string;
}

export interface OpenProjectQuery extends HalResource {
  id: number;
  name: string;
  public?: boolean;
  starred?: boolean;
}

export interface OpenProjectNotification extends HalResource {
  id: number;
  reason?: string;
  readIAN?: boolean;
  readAt?: string;
  createdAt?: string;
}
