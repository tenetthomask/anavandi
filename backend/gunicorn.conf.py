# Gunicorn configuration file
# This is automatically loaded by Gunicorn if present in the working directory.

# Increase timeout to 300 seconds (5 minutes) to allow Vision AI processing
# which can take 35-45 seconds for complex timetable images.
timeout = 300

# Keep-alive timeout
keepalive = 5

# Workers
workers = 2
