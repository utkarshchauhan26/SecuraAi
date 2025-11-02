const { createClient } = require('@supabase/supabase-js');

class ResilientSupabaseClient {
  constructor(supabaseUrl, supabaseServiceKey) {
    this.client = createClient(supabaseUrl, supabaseServiceKey);
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async withRetry(operation, context = '') {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if it's a network error
        const isNetworkError = error.message?.includes('fetch failed') || 
                              error.message?.includes('ENOTFOUND') ||
                              error.code === 'ENOTFOUND';

        if (isNetworkError && attempt < this.maxRetries) {
          console.warn(`⚠️ Network error on attempt ${attempt}/${this.maxRetries} (${context}), retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * attempt); // Exponential backoff
          continue;
        }

        // If it's not a network error or we've exhausted retries, throw immediately
        throw error;
      }
    }

    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async select(table) {
    return this.withRetry(
      () => this.client.from(table),
      `select from ${table}`
    );
  }

  async insert(table, data) {
    return this.withRetry(
      () => this.client.from(table).insert(data),
      `insert into ${table}`
    );
  }

  async update(table, data, filter) {
    return this.withRetry(
      () => this.client.from(table).update(data).match(filter),
      `update ${table}`
    );
  }

  async upsert(table, data) {
    return this.withRetry(
      () => this.client.from(table).upsert(data),
      `upsert into ${table}`
    );
  }

  // Direct access to client for complex queries
  get from() {
    return this.client.from.bind(this.client);
  }

  get auth() {
    return this.client.auth;
  }
}

module.exports = ResilientSupabaseClient;