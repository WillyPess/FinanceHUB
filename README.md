# FinanceHub SQLite

React frontend, Express API, and a local SQLite database file.

## Project layout

The runnable app uses these folders:

```text
server/   Express API on http://localhost:3001
client/   Vite app on http://localhost:5173
```

The SQLite database file is created here on first backend start:

```text
server/financehub.db
```

## Run locally

From the project root:

```powershell
npm.cmd install
cd client
npm.cmd install
cd ..
npm.cmd run dev
```

If PowerShell blocks `npm`, use `npm.cmd` exactly as shown above.

Backend health check:

```text
http://localhost:3001/api/health
```

## DBeaver connection

1. Open DBeaver.
2. Create a new database connection.
3. Choose `SQLite`.
4. Set the database file path to:

```text
D:\IT Files\Coding\financehub-sqlite\financehub-sqlite\server\financehub.db
```

5. Test the connection and finish.

If the file does not exist yet, start the backend once and refresh the folder.

## Useful queries

```sql
SELECT name, amount, frequency, next_billing
FROM subscriptions
WHERE status = 'active';

SELECT category, SUM(amount) AS total
FROM transactions
WHERE type = 'expense'
  AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
GROUP BY category
ORDER BY total DESC;

SELECT
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
FROM transactions;
```
