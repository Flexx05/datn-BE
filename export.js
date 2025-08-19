import fs from "fs";
import { MongoClient, ObjectId } from "mongodb";

const uri =
  "mongodb+srv://root:binova2025@datn-db.nx9ha3d.mongodb.net/datn-binova";

/**
 * Hàm convert field sang Extended JSON:
 * - _id và các field kết thúc bằng "Id" -> ObjectId
 * - Date -> $date
 */
function convertObjectIds(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => convertObjectIds(item));
  }

  if (typeof obj === "object") {
    // Nếu là Date thì convert thành $date
    if (obj instanceof Date) {
      return { $date: obj.toISOString() };
    }

    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if ((key === "_id" || key.endsWith("Id")) && ObjectId.isValid(value)) {
        newObj[key] = { $oid: String(value) };
      } else {
        newObj[key] = convertObjectIds(value);
      }
    }
    return newObj;
  }

  return obj;
}

async function exportCollections() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db("datn-binova");

    // Lấy danh sách tất cả collections
    const collections = await db.listCollections().toArray();

    for (const { name } of collections) {
      console.log(`📦 Đang export collection: ${name}...`);

      const data = await db.collection(name).find({}).toArray();

      // Convert sang NDJSON
      const ndjson = data
        .map((doc) => JSON.stringify(convertObjectIds(doc)))
        .join("\n");

      fs.writeFileSync(`${name}.ndjson`, ndjson, "utf-8");
      console.log(`✅ Export thành công -> ${name}.ndjson`);
    }
  } catch (err) {
    console.error("❌ Lỗi export:", err);
  } finally {
    await client.close();
  }
}

exportCollections();
