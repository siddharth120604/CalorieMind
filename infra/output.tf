output "ec2_public_ip" {
  description = "Public IP of EC2"
  value       = aws_instance.app.public_ip
}

output "backup_bucket_name" {
  description = "S3 bucket for database backups"
  value       = aws_s3_bucket.db_backups.bucket
}
