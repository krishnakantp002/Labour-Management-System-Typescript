-- =====================================================
-- Activity / Audit Log — records every alteration (002)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_id    VARCHAR(36),
    actor_name  VARCHAR(255),
    actor_role  VARCHAR(20),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(30),
    method      VARCHAR(10) NOT NULL,
    route       VARCHAR(255) NOT NULL,
    status_code INT NOT NULL,
    ip          VARCHAR(45),
    details     TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_created_at (created_at),
    INDEX idx_logs_actor (actor_id),
    INDEX idx_logs_action (action)
);
