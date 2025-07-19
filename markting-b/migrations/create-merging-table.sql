-- Create merging table to track contact merge operations
CREATE TABLE merging (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    group_id INTEGER NOT NULL,
    primary_account_id VARCHAR(255) NOT NULL,
    secondary_account_id VARCHAR(255) NOT NULL,
    merge_status VARCHAR(50) DEFAULT 'pending',
    merged_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_group (user_id, group_id),
    INDEX idx_merge_status (merge_status),
    INDEX idx_created_at (created_at)
);
