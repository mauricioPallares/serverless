# Poli Serverless

Proyecto serverless con dos partes:

- Backend AWS Lambda en Node.js (`index.mjs`) que consulta una tabla DynamoDB.
- Frontend estatico (`index.html`) que consume la API y muestra una tabla paginada con graficas.

## Objetivo

Exponer informacion de universidades (dataset top 100) via API y visualizarla en un dashboard web.

## Estructura del proyecto

```text
.
├── data/
│   └── top_100_universities_dataset.csv
├── index.html
└── index.mjs
```

## Stack tecnico

- Node.js (Lambda handler en ESM)
- AWS SDK v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Amazon S3 (almacenamiento del dataset CSV)
- Amazon DynamoDB
- AWS Amplify (hosting/despliegue del frontend)
- Frontend HTML + Tailwind CDN + Chart.js + Lucide icons

## Backend (`index.mjs`)

### Funcion principal

`handler(event)` soporta:

- `GET ?page=N`: retorna una pagina de resultados.
- `GET ?University_Name=...`: busca por nombre exacto de universidad.

### Configuracion actual en codigo

- Tabla DynamoDB: `dataset-poli-table`
- Tamano de pagina: `10`
- CORS habilitado con `Access-Control-Allow-Origin: *`

### Respuesta de paginacion

Para `?page=N`, la respuesta incluye:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 10,
  "count": 10,
  "hasNextPage": true
}
```

### Respuesta de busqueda por nombre

Para `?University_Name=University of Oxford`:

```json
{
  "data": {
    "Position": 1,
    "University_Name": "University of Oxford"
  }
}
```

Si no encuentra registros, retorna:

- HTTP `404`
- `{ "message": "Universidad no encontrada" }`

### Campos esperados en DynamoDB

Tomados del CSV (`data/top_100_universities_dataset.csv`):

- `Position`
- `University_Name`
- `Location`
- `Established_Year`
- `Total_Students`
- `Number_of_Campuses`
- `Programs_Offered`
- `University_Type`
- `Total_Faculty`
- `Campus_Area_Acres`

## Carga de datos (S3 -> DynamoDB)

El flujo de ingesta de datos considera:

1. El dataset CSV se almacena en un bucket S3.
2. Desde ese origen se carga/procesa la informacion para poblar la tabla DynamoDB `dataset-poli-table`.
3. La Lambda de consulta (`index.mjs`) lee los registros desde DynamoDB para exponerlos en la API.

Esto separa la capa de almacenamiento de archivos (S3) de la capa de consulta de baja latencia (DynamoDB).

## Frontend (`index.html`)

### Que muestra

- Tabla con resultados paginados.
- Modal con detalle por universidad.
- 4 graficas:
  - Estudiantes por universidad (bar)
  - Tipo de universidad (doughnut)
  - Facultad por universidad (line)
  - Programas ofrecidos (polar area)

### Endpoint configurado en frontend

El frontend consume:

- `https://imqtyyspi3.execute-api.us-east-2.amazonaws.com/default/poli`

Para cambiarlo, edita la constante `API_URL` en `index.html`.

### Despliegue del frontend

El frontend se desplego usando AWS Amplify (Amplify Hosting), que publica el sitio estatico y facilita la integracion con el repositorio Git para despliegues continuos.

## Requisitos

- Node.js 18+ recomendado
- AWS credentials configuradas (si ejecutas backend local con acceso real a DynamoDB)
- Tabla DynamoDB existente: `dataset-poli-table`

## Ejecutar frontend localmente

Puedes abrir `index.html` directo, pero se recomienda servidor local.

Ejemplo con Python:

```bash
python3 -m http.server 8080
```

Luego abre:

- `http://localhost:8080/index.html`

## Probar backend localmente (invocacion simple)

Ejemplo rapido desde Node (sin framework), suponiendo que tienes credenciales AWS validas:

```bash
node -e "import('./index.mjs').then(async ({handler}) => { const r = await handler({ queryStringParameters: { page: '1' } }); console.log(r); })"
```

Busqueda por nombre:

```bash
node -e "import('./index.mjs').then(async ({handler}) => { const r = await handler({ queryStringParameters: { University_Name: 'University of Oxford' } }); console.log(r); })"
```

## Flujo de datos

1. El dataset CSV se almacena en S3.
2. El dataset se carga desde S3 hacia DynamoDB (`dataset-poli-table`).
3. El navegador pide `GET ?page=N` a API Gateway.
4. Lambda consulta DynamoDB, ordena por `Position`, pagina resultados y responde JSON.
5. Frontend desplegado en Amplify renderiza tabla, modal y graficas.
