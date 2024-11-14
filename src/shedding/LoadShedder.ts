// src/shedding/LoadShedder.ts

import { ISheddingStrategy } from './ISheddingStrategy';
import { IMetricsStorage } from '../storage/IMetricsStorage';
import * as crypto from 'crypto';

export class LoadShedder {
  private sheddingPercentage = 0;

  constructor(
    private readonly metricsStorage: IMetricsStorage,
    private readonly sheddingStrategy: ISheddingStrategy
  ) {}

  /**
   * Updates the shedding percentage based on aggregated metrics.
   */
  public async updateSheddingPercentage(): Promise<void> {
    const aggregatedMetrics = await this.metricsStorage.getMetrics();
    this.sheddingPercentage = this.sheddingStrategy.calculateSheddingPercentage(aggregatedMetrics);
    console.debug(`Updated shedding percentage to ${this.sheddingPercentage}%`);
  }

  /**
   * Determines if a request should be processed based on the identifier.
   * @param identifier - Unique identifier for the request (e.g., user ID, IP address).
   * @returns True if the request should be processed; false otherwise.
   */
  public shouldProcessRequest(identifier: string): boolean {
    const hashValue = this.hashIdentifier(identifier);
    const result = (hashValue % 100) >= this.sheddingPercentage;
    console.debug(
      `Identifier: ${identifier}, Hash Value: ${hashValue % 100}, Shedding Percentage: ${this.sheddingPercentage}, Should Process: ${result}`
    );
    return result;
  }

  /**
   * Gets the current shedding percentage.
   * @returns The current shedding percentage.
   */
  public getSheddingPercentage(): number {
    return this.sheddingPercentage;
  }

  /**
   * Hashes the identifier to produce a numeric value.
   * @param identifier - The identifier to hash.
   * @returns A numeric hash value.
   */
  private hashIdentifier(identifier: string): number {
    const hash = crypto.createHash('sha256').update(identifier).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }
}