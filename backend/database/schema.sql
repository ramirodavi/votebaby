CREATE TABLE votes (
	id serial4 NOT NULL,
	name varchar(255) NOT NULL,
	gender varchar(10) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	browser_id varchar(255) NULL,
	CONSTRAINT votes_gender_check CHECK (((gender)::text = ANY (ARRAY[('boy'::character varying)::text, ('girl'::character varying)::text]))),
	CONSTRAINT votes_pkey PRIMARY KEY (id)
);

CREATE TABLE comments (
	id serial4 NOT NULL,
	name varchar(100) NOT NULL,
	message text NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	browser_id varchar(255) NULL,
	CONSTRAINT comments_pkey PRIMARY KEY (id)
);

-- Índice para busca rápida por nome e gênero nos votos
CREATE INDEX IF NOT EXISTS idx_votes_name_gender ON votes(name, gender);

-- Índice para busca por browser_id nos votos
CREATE INDEX IF NOT EXISTS idx_votes_browser_id ON votes(browser_id);

-- Índice para busca rápida por nome nos comentários
CREATE INDEX IF NOT EXISTS idx_comments_name ON comments(name);

-- Índice para busca por browser_id nos comentários
CREATE INDEX IF NOT EXISTS idx_comments_browser_id ON comments(browser_id);

-- Comentários para documentação
COMMENT ON TABLE votes IS 'Armazena os votos de nomes por usuários identificados por browser_id';
COMMENT ON COLUMN votes.id IS 'Identificador único do voto';
COMMENT ON COLUMN votes.name IS 'Nome votado';
COMMENT ON COLUMN votes.gender IS 'Gênero do nome votado (boy/girl)';
COMMENT ON COLUMN votes.created_at IS 'Data/hora em que o voto foi registrado';
COMMENT ON COLUMN votes.browser_id IS 'Identificador anônimo do navegador do usuário';

COMMENT ON TABLE comments IS 'Armazena comentários sobre nomes';
COMMENT ON COLUMN comments.id IS 'Identificador único do comentário';
COMMENT ON COLUMN comments.name IS 'Nome comentado';
COMMENT ON COLUMN comments.message IS 'Mensagem do comentário';
COMMENT ON COLUMN comments.created_at IS 'Data/hora em que o comentário foi registrado';
COMMENT ON COLUMN comments.browser_id IS 'Identificador anônimo do navegador do usuário';

-- Constraint para garantir que não haja votos duplicados do mesmo browser_id para o mesmo nome/gênero
ALTER TABLE votes
    ADD CONSTRAINT unique_vote_per_user_name_gender UNIQUE (browser_id, name, gender);

-- Constraint para garantir que não haja comentários duplicados do mesmo browser_id para o mesmo nome e mensagem
ALTER TABLE comments
    ADD CONSTRAINT unique_comment_per_user_name_message UNIQUE (browser_id, name, message);