import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.models.catalog import CatalogExercise
from test_auth import client
from test_workouts import editable, sign_in


@pytest.fixture
def catalog(client):
    c, db = client
    directory = Path(__file__).resolve().parents[1] / 'alembic/versions'
    modules = []
    for filename in ('0005_shared_exercise_catalog.py', '0006_expand_exercise_catalog.py'):
        spec = importlib.util.spec_from_file_location(filename[:-3], directory / filename)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        modules.append(module)
    records = {item['id']: dict(item) for item in modules[0].EXERCISES + modules[1].NEW_EXERCISES}
    for item in modules[1].SEARCH_UPDATES:
        records[item['id']]['search_text'] = item['search_text']
    db.add_all(CatalogExercise(**item) for item in records.values())
    db.commit()
    return c, db


def test_catalog_shared_with_existing_and_future_accounts(catalog):
    c, db = catalog
    assert c.get('/api/exercise-catalog').status_code == 401
    sign_in(c)
    first = c.get('/api/exercise-catalog?limit=50')
    assert first.status_code == 200
    assert first.json()['total'] == 94
    assert len(first.json()['items']) == 50
    sign_in(c, 'future@example.com')
    assert c.get('/api/exercise-catalog?limit=50').json() == first.json()
    assert db.scalar(select(func.count()).select_from(CatalogExercise)) == 94
    assert c.post('/api/exercise-catalog', json={'name': 'Não pode publicar'}).status_code == 405
    assert c.put('/api/exercise-catalog/supino-reto-barra', json={'name': 'Alterado'}).status_code in (404, 405)


def test_search_accent_filters_pagination_and_literal_wildcards(catalog):
    c, _ = catalog
    sign_in(c)
    result = c.get('/api/exercise-catalog?q=BICEPS').json()
    assert result['total'] == 9
    assert all(item['muscle_group'] == 'Bíceps' for item in result['items'])
    result = c.get('/api/exercise-catalog', params={'q': '  supino  ', 'muscle_group': 'Peito', 'equipment': 'Halteres'}).json()
    assert result['total'] == 2
    assert all(item['equipment'] == 'Halteres' for item in result['items'])
    first = c.get('/api/exercise-catalog?limit=20').json()
    second = c.get('/api/exercise-catalog?limit=20&offset=20').json()
    last = c.get('/api/exercise-catalog?limit=20&offset=40').json()
    assert [len(page['items']) for page in (first, second, last)] == [20, 20, 20]
    all_pages = [c.get(f'/api/exercise-catalog?limit=20&offset={offset}').json() for offset in range(0, 100, 20)]
    assert len({item['id'] for page in all_pages for item in page['items']}) == 94
    for query in ('%', '_', "' OR 1=1"):
        assert c.get('/api/exercise-catalog', params={'q': query}).json()['total'] == 0
    filters = c.get('/api/exercise-catalog/filters').json()
    assert 'Peito' in filters['muscle_groups']
    assert 'Halteres' in filters['equipment']


def test_catalog_selection_and_private_manual_exercise(catalog):
    c, _ = catalog
    sign_in(c)
    response = c.post('/api/workouts', json={'name': 'Misto', 'exercises': [
        {'catalog_exercise_id': 'supino-reto-barra', 'sets': [{'target_repetitions': 8, 'target_weight': '60'}]},
        {'name': 'Meu exercício particular', 'sets': []},
    ]})
    assert response.status_code == 201
    workout = response.json()
    assert workout['exercises'][0]['name'] == 'Supino reto com barra'
    assert workout['exercises'][0]['catalog_exercise_id'] == 'supino-reto-barra'
    assert workout['exercises'][1]['catalog_exercise_id'] is None
    sign_in(c, 'second@example.com')
    assert c.get('/api/exercise-catalog?q=particular').json()['total'] == 0
    assert c.get('/api/workouts/' + workout['id']).status_code == 404
    assert c.get('/api/exercise-catalog?q=supino').json()['total'] == 10


@pytest.mark.parametrize('exercise', [
    {'catalog_exercise_id': 'missing'},
    {'catalog_exercise_id': ''},
    {'sets': []},
    {'name': '   '},
])
def test_invalid_reference_or_missing_manual_name(catalog, exercise):
    c, _ = catalog
    sign_in(c)
    assert c.post('/api/workouts', json={'name': 'Inválido', 'exercises': [exercise]}).status_code == 422
    assert c.get('/api/workouts').json() == []


def test_snapshot_survives_catalog_changes_and_conversion_to_manual(catalog):
    c, db = catalog
    sign_in(c)
    workout = c.post('/api/workouts', json={'name': 'A', 'exercises': [
        {'catalog_exercise_id': 'supino-reto-barra', 'name': 'Nome enviado não deve substituir o catálogo', 'sets': [{'target_repetitions': 8}]},
    ]}).json()
    assert workout['exercises'][0]['name'] == 'Supino reto com barra'
    item = db.get(CatalogExercise, 'supino-reto-barra')
    item.name = 'Novo nome no catálogo'
    db.commit()
    data = editable(workout)
    data['exercises'][0]['catalog_exercise_id'] = 'supino-reto-barra'
    response = c.put('/api/workouts/' + workout['id'], json=data)
    assert response.status_code == 200
    assert response.json()['exercises'][0]['name'] == 'Supino reto com barra'
    session = c.post('/api/sessions', json={'workout_template_id': workout['id']}).json()
    assert session['exercises'][0]['name_snapshot'] == 'Supino reto com barra'
    data['exercises'][0].update(catalog_exercise_id=None, name='Minha variação')
    updated = c.put('/api/workouts/' + workout['id'], json=data).json()
    assert updated['exercises'][0]['name'] == 'Minha variação'
    assert updated['exercises'][0]['catalog_exercise_id'] is None
    assert c.get('/api/sessions/' + session['id']).json()['exercises'][0]['name_snapshot'] == 'Supino reto com barra'
    assert db.get(CatalogExercise, 'supino-reto-barra').name == 'Novo nome no catálogo'


def test_catalog_deletion_does_not_remove_workout(catalog):
    c, db = catalog
    sign_in(c)
    workout = c.post('/api/workouts', json={'name': 'A', 'exercises': [{'catalog_exercise_id': 'supino-reto-barra'}]}).json()
    db.delete(db.get(CatalogExercise, 'supino-reto-barra'))
    db.commit()
    saved = c.get('/api/workouts/' + workout['id']).json()
    assert saved['exercises'][0]['name'] == 'Supino reto com barra'
    assert saved['exercises'][0]['catalog_exercise_id'] is None


@pytest.mark.parametrize('query', ['limit=51', 'offset=-1', 'q=' + 'x' * 101])
def test_query_bounds(catalog, query):
    c, _ = catalog
    sign_in(c)
    assert c.get('/api/exercise-catalog?' + query).status_code == 422



def test_all_new_names_and_aliases_are_searchable(catalog):
    c, _ = catalog
    sign_in(c)
    path = Path(__file__).resolve().parents[1] / 'alembic/versions/0006_expand_exercise_catalog.py'
    spec = importlib.util.spec_from_file_location('expanded_catalog', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for item in module.NEW_EXERCISES:
        result = c.get('/api/exercise-catalog', params={'q': item['name'], 'limit': 50}).json()
        assert item['id'] in {match['id'] for match in result['items']}, item['name']
    for item in module.SEARCH_UPDATES:
        result = c.get('/api/exercise-catalog', params={'q': item['alias'], 'limit': 50}).json()
        assert item['id'] in {match['id'] for match in result['items']}, item['alias']


def test_specific_variants_and_new_muscle_groups(catalog):
    c, db = catalog
    sign_in(c)
    for group, identifier in [('Antebraços', 'flexao-punho-barra'), ('Adutores', 'cadeira-adutora'),
                              ('Lombar', 'extensao-lombar-banco-romano'), ('Trapézio', 'encolhimento-barra')]:
        result = c.get('/api/exercise-catalog', params={'muscle_group': group}).json()
        assert identifier in {item['id'] for item in result['items']}
    for identifiers in [('stiff-barra', 'terra-romeno-barra'),
                        ('cadeira-extensora-bilateral', 'cadeira-extensora-unilateral'),
                        ('rosca-direta-barra-reta', 'rosca-direta-barra-w')]:
        assert all(db.get(CatalogExercise, identifier) is not None for identifier in identifiers)
    assert c.get('/api/exercise-catalog', params={'q': 'serrote'}).json()['items'][0]['id'] == 'remada-unilateral-halter'
    assert c.get('/api/exercise-catalog', params={'q': 'Leg Press 45°'}).json()['items'][0]['id'] in ('leg-press-45', 'panturrilha-leg-press-45')
