# ------------------
# VPC
# ------------------
resource "aws_vpc" "main" {
  cidr_block           = "10.123.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "caloriemind-vpc"
  }
}

# ------------------
# Public Subnet
# ------------------
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.123.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "caloriemind-public-subnet"
  }
}

# ------------------
# Internet Gateway
# ------------------
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "caloriemind-igw"
  }
}

# ------------------
# Route Table
# ------------------
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "caloriemind-public-rt"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}

# ------------------
# Security Group
# ------------------
resource "aws_security_group" "web_sg" {
  name   = "caloriemind-web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "caloriemind-sg"
  }
}

# ------------------
# EC2 Instance
# ------------------
resource "aws_instance" "app" {
  ami                         = "ami-0c7217cdde317cfec" # Ubuntu 22.04 us-east-1
  instance_type               = var.instance_type
  key_name                    = var.key_name
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web_sg.id]
  associate_public_ip_address = true

  tags = {
    Name = "caloriemind-ec2"
  }
}

# ------------------
# S3 Bucket for DB Backups
# ------------------
resource "aws_s3_bucket" "db_backups" {
  bucket = "caloriemind-db-backups"

  tags = {
    Name = "caloriemind-db-backups"
  }
}

resource "aws_s3_bucket_versioning" "db_backups_versioning" {
  bucket = aws_s3_bucket.db_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}
