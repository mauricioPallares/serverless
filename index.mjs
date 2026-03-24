import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "dataset-poli-table";
const PAGE_SIZE = 10;

const response = (statusCode, body) => ({
    statusCode,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",

    },
    body: JSON.stringify(body),
});

export const handler = async (event) => {
    const params = event.queryStringParameters || {};
    const universityName = params.University_Name;
    const page = Math.max(Number.parseInt(params.page, 10) || 1, 1);

    try {
    
        if (universityName) {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: "University_Name = :name",
                ExpressionAttributeValues: { ":name": universityName },
            });
            const result = await docClient.send(command);

            if (!result.Items || result.Items.length === 0) {
                return response(404, { message: "Universidad no encontrada" });
            }

            return response(200, { data: result.Items[0] });
        }

        let scannedItems = [];
        let lastEvaluatedKey = undefined;

        do {
            const command = new ScanCommand({
                TableName: TABLE_NAME,
                ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
            });
            const result = await docClient.send(command);

            scannedItems = scannedItems.concat(result.Items);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        // Ordenar por Position de menor a mayor
        scannedItems.sort((a, b) => Number(a.Position) - Number(b.Position));

        const start = (page - 1) * PAGE_SIZE;
        const pageItems = scannedItems.slice(start, start + PAGE_SIZE);
        const hasNextPage = start + PAGE_SIZE < scannedItems.length;

        return response(200, {
            data: pageItems,
            page,
            pageSize: PAGE_SIZE,
            count: pageItems.length,
            hasNextPage,
        });
    } catch (error) {
        console.error(error);
        return response(500, { error: error.message });
    }
};