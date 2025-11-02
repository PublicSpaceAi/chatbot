# Use official Python image
FROM python:3.10-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency list first
COPY requirements.txt .

# Install all Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy your project files
COPY . .

# Expose the port Flask will run on
EXPOSE 5000

# Run the Flask app
CMD ["python", "app.py"]
