import { runWrite, type DbClient } from "./client";

/** All payment_customers table access (provider-side customer ids per user). */
export class PaymentCustomerRepository {
  constructor(private readonly db: DbClient) {}

  async listByUserId(userId: string): Promise<{ provider: string; customer_id: string }[]> {
    const { rows } = await this.db.query<{ provider: string; customer_id: string }>(
      `select provider, customer_id from payment_customers where user_id = $1`,
      [userId]
    );
    return rows;
  }

  async findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<{ customer_id: string } | null> {
    const { rows } = await this.db.query<{ customer_id: string }>(
      `select customer_id from payment_customers where user_id = $1 and provider = $2`,
      [userId, provider]
    );
    return rows[0] ?? null;
  }

  async create(row: { user_id: string; provider: string; customer_id: string }) {
    return runWrite(() =>
      this.db.query(
        `insert into payment_customers (user_id, provider, customer_id) values ($1, $2, $3)`,
        [row.user_id, row.provider, row.customer_id]
      )
    );
  }
}
