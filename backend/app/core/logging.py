import logging
import sys

def setup_logging():
    # Clear existing handlers to avoid duplicates
    root_logger = logging.getLogger()
    if root_logger.handlers:
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)

    # Logging format: Time | Level | Module | Message
    log_format = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console Handler
    console_handler = sys.stdout
    stdout_handler = logging.StreamHandler(console_handler)
    stdout_handler.setFormatter(log_format)
    stdout_handler.setLevel(logging.INFO)

    root_logger.addHandler(stdout_handler)
    root_logger.setLevel(logging.INFO)

    # Disable verbose third-party libraries logs
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)

setup_logging()
logger = logging.getLogger("stadium_os")
