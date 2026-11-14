
import mysql.connector
from mysql.connector import Error
from backend.config import Config


def get_db_connection():
    connection = None

    try:
        connection = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DATABASE
        )

        if connection.is_connected():
            print("MySQL database connected successfully!")
            return connection

    except Error as e:
        print("Database connection error:", e)

        if connection and connection.is_connected():
            connection.close()

    return None
