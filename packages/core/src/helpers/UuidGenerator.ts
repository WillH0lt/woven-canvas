import { v5 as uuid } from 'uuid';

const namespace = '00000000-0000-0000-0000-000000000000';

export class UuidGenerator {
  public constructor(private seed = '') {}

  public next(): string {
    // Generate a new UUID using the namespace and the seed
    const id = uuid(this.seed, namespace);
    this.seed = id; // Update the seed for the next call
    return id;
  }
  
}