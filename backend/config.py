
import os
from dotenv import load_dotenv

# Get the project root directory
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

# Load environment variables from the root .env file
ENV_FILE = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_FILE)


class Config:
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "jobpilot-secret-key"
    )

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "jobpilot_ai")
