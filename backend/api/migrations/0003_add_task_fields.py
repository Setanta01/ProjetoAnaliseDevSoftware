from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_initial_schema'), # Depende da migration anterior
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tasks 
                ADD COLUMN story_points INT NULL,
                ADD COLUMN due_date DATE NULL,
                ADD COLUMN tags VARCHAR(255) NULL;
            """,
            reverse_sql="""
                ALTER TABLE tasks DROP COLUMN story_points;
                ALTER TABLE tasks DROP COLUMN due_date;
                ALTER TABLE tasks DROP COLUMN tags;
            """
        )
    ]