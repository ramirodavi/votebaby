CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('boy', 'girl')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    browser_id VARCHAR(255)
);