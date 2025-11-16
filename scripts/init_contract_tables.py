#!/usr/bin/env python3
"""
Database initialization script for contract address tables
Run this to create all necessary tables in PostgreSQL
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from app.database import init_db, engine
from sqlalchemy import text

# Load environment variables
load_dotenv()


def run_migration_sql():
    """Run SQL migration file"""
    migration_file = Path(__file__).parent / 'migrate_contract_tables.sql'
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    try:
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Split by semicolons and execute each statement
        statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        with engine.connect() as conn:
            for statement in statements:
                if statement:
                    try:
                        conn.execute(text(statement))
                        conn.commit()
                    except Exception as e:
                        # Ignore "already exists" errors
                        if 'already exists' not in str(e).lower() and 'duplicate' not in str(e).lower():
                            print(f"⚠️  Warning executing statement: {e}")
                            print(f"   Statement: {statement[:100]}...")
        
        print("✅ SQL migration completed")
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False


def main():
    """Main initialization function"""
    print("🚀 Initializing contract address database tables...")
    print()
    
    # Check DATABASE_URL
    if not os.getenv('DATABASE_URL'):
        print("❌ DATABASE_URL environment variable is not set")
        print("   Please set it in your .env file or environment")
        sys.exit(1)
    
    print(f"📦 Database URL: {os.getenv('DATABASE_URL')[:50]}...")
    print()
    
    # Run SQL migration
    print("📝 Running SQL migration...")
    if not run_migration_sql():
        print("❌ Migration failed")
        sys.exit(1)
    
    print()
    
    # Initialize SQLAlchemy models (creates tables if they don't exist)
    print("🔧 Initializing SQLAlchemy models...")
    try:
        init_db()
        print("✅ SQLAlchemy models initialized")
    except Exception as e:
        print(f"⚠️  Warning: {e}")
        print("   Tables may already exist, continuing...")
    
    print()
    print("✅ Database initialization complete!")
    print()
    print("📊 Created tables:")
    print("   - contract_addresses")
    print("   - pair_contracts")
    print("   - failed_contract_lookups")
    print("   - api_call_logs")
    print()
    print("🎉 You can now use the ContractResolver service!")


if __name__ == '__main__':
    main()

