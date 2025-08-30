-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create endpoints table
CREATE TABLE IF NOT EXISTS endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  path TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  field_descriptions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_project_id ON groups(project_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_group_id ON endpoints(group_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_path_method ON endpoints(path, method);

-- Insert sample data
INSERT INTO projects (id, name, description) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Sample API', 'A sample API project for demonstration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO groups (id, name, project_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Users', '550e8400-e29b-41d4-a716-446655440000'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Posts', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO endpoints (id, name, method, path, group_id, responses, field_descriptions) VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Get User',
    'GET',
    '/api/v1/user',
    '550e8400-e29b-41d4-a716-446655440001',
    '{"200": "{\"name\":\"John\", \"age\":30, \"car\":null}", "400": "{\"error\":\"Bad Request\"}", "401": "{\"error\":\"Unauthorized\"}", "403": "{\"error\":\"Forbidden\"}", "404": "{\"error\":\"User not found\"}", "500": "{\"error\":\"Internal Server Error\"}"}',
    '{"name": {"type": "STRING", "description": "ชื่อของผู้ใช้"}, "age": {"type": "INTEGER", "description": "อายุของผู้ใช้"}, "car": {"type": "NULL", "description": "รถของผู้ใช้"}}'
  )
ON CONFLICT (id) DO NOTHING;
