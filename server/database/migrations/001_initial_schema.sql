-- =====================================================
-- Labour Management System - Initial Database Schema (MySQL)
-- =====================================================

CREATE TABLE users (
    id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    worker_id     VARCHAR(36) UNIQUE,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE workers (
    id            VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    worker_id     VARCHAR(20) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    photo_url     VARCHAR(500),
    status        ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    remarks       TEXT,
    created_by_id VARCHAR(36) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id)
);

ALTER TABLE users
    ADD CONSTRAINT fk_users_worker_id
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL;

CREATE TABLE products (
    id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name       VARCHAR(255) UNIQUE NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rates (
    id             VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id     VARCHAR(36) NOT NULL,
    rate_per_ton   DECIMAL(10, 2) NOT NULL,
    changed_by_id  VARCHAR(36) NOT NULL,
    effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_id) REFERENCES users(id)
);

CREATE TABLE attendance (
    id           VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    worker_id    VARCHAR(36) NOT NULL,
    date         DATE NOT NULL,
    status       ENUM('PRESENT', 'ABSENT') NOT NULL,
    check_in     DATETIME,
    check_out    DATETIME,
    marked_by_id VARCHAR(36) NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, date),
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by_id) REFERENCES users(id)
);

CREATE TABLE work_entries (
    id             VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    worker_id      VARCHAR(36) NOT NULL,
    product_id     VARCHAR(36) NOT NULL,
    quantity_tons  DECIMAL(10, 2) NOT NULL,
    rate_used      DECIMAL(10, 2) NOT NULL,
    amount         DECIMAL(10, 2) NOT NULL,
    work_date      DATE NOT NULL,
    recorded_by_id VARCHAR(36) NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by_id) REFERENCES users(id)
);

CREATE TABLE payments (
    id           VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    worker_id    VARCHAR(36) NOT NULL,
    amount       DECIMAL(10, 2) NOT NULL,
    method       ENUM('CASH', 'UPI', 'BANK') NOT NULL,
    reference    VARCHAR(255),
    payment_date DATE NOT NULL,
    paid_by_id   VARCHAR(36) NOT NULL,
    remarks      TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by_id) REFERENCES users(id)
);

CREATE INDEX idx_workers_status           ON workers(status);
CREATE INDEX idx_attendance_date          ON attendance(date);
CREATE INDEX idx_rates_product_effective  ON rates(product_id, effective_from);
CREATE INDEX idx_work_entries_worker_date ON work_entries(worker_id, work_date);
CREATE INDEX idx_work_entries_date        ON work_entries(work_date);
CREATE INDEX idx_payments_worker_date     ON payments(worker_id, payment_date);
CREATE INDEX idx_payments_date            ON payments(payment_date);
