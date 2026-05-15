

from django.db import migrations

# Função auxiliar para ler o arquivo SQL
def load_sql_from_file(apps, schema_editor):
    # Caminho absoluto ou relativo ao arquivo de migração
    with open('api/migrations/sql/initial_schema.sql', 'r', encoding='utf-8') as file:
        sql = file.read()
    
    # Executa o SQL
    # Podemos dividir por ponto e vírgula se o banco não suportar múltiplos statements
    # por padrão, mas o execute() do cursor geralmente aceita.
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(sql)

class Migration(migrations.Migration):

    dependencies = [
        
    ]

    operations = [
        migrations.RunPython(load_sql_from_file),
    ]