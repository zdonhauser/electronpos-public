CREATE TYPE recurring_entry_type AS ENUM ('hours', 'deduction');

CREATE TABLE recurring_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    type recurring_entry_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    created_by INTEGER,
    modified_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_amount CHECK (
        (type = 'hours' AND amount > 0) OR
        (type = 'deduction' AND amount < 0)
    )
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recurring_entries_updated_at
    BEFORE UPDATE ON recurring_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_recurring_entries_employee_id ON recurring_entries(employee_id);
CREATE INDEX idx_recurring_entries_dates ON recurring_entries(start_date, end_date);
