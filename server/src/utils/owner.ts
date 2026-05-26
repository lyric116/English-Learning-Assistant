export type OwnerType = 'anonymous' | 'user';

export interface DataOwner {
  ownerType: OwnerType;
  ownerId: string;
}

export type OwnerInput = DataOwner | string | undefined;

export function normalizeOwnerId(rawOwnerId: string | undefined): string {
  const trimmed = (rawOwnerId || '').trim();
  return trimmed || 'anonymous-default';
}

export function normalizeDataOwner(input: OwnerInput): DataOwner {
  if (input && typeof input === 'object') {
    return {
      ownerType: input.ownerType === 'user' ? 'user' : 'anonymous',
      ownerId: normalizeOwnerId(input.ownerId),
    };
  }

  return {
    ownerType: 'anonymous',
    ownerId: normalizeOwnerId(input),
  };
}
