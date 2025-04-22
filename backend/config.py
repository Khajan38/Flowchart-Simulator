
import os

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-for-flowchart-maker'
    DATA_DIR = os.environ.get('FLOWCHART_DATA_DIR') or 'data/flowcharts/'
    DEBUG = False
    TESTING = False

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATA_DIR = 'tests/data/flowcharts/'

class ProductionConfig(Config):
    """Production configuration"""
    # Production-specific settings
    DATA_DIR = '/var/data/flowcharts/'
    
    @classmethod
    def init_app(cls, app):
        # Log to syslog for production
        import logging
        from logging.handlers import SysLogHandler
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}