import { MongoClient, ObjectId, type Db } from 'mongodb';

export interface QuestRecord {
  _id?: string;
  location: string;
  spots: string[];
  narrative: string;
  audioUrl?: string;
  model?: string;
  createdAt: Date;
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export async function getDatabase(): Promise<Db | null> {
  if (!clientPromise) return null;
  try {
    const connectedClient = await clientPromise;
    return connectedClient.db('nature_quest');
  } catch (err) {
    console.warn('MongoDB connection could not be established:', err);
    return null;
  }
}

export async function saveQuest(
  quest: Omit<QuestRecord, 'createdAt'>
): Promise<{ success: boolean; id?: string }> {
  try {
    const db = await getDatabase();
    if (!db) return { success: false };
    // Exclude string _id from insert payload so MongoDB generates ObjectId
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...docData } = quest;
    const insertResult = await db.collection('quests').insertOne({
      ...docData,
      createdAt: new Date(),
    });
    return { success: true, id: insertResult.insertedId.toString() };
  } catch (err) {
    console.warn('Failed to save quest to MongoDB Atlas:', err);
    return { success: false };
  }
}

export async function getQuestById(id: string): Promise<QuestRecord | null> {
  try {
    const db = await getDatabase();
    if (!db) return null;
    let query: Record<string, unknown> = { _id: id };
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    }
    const doc = await db.collection('quests').findOne(query);
    if (!doc) return null;

    return {
      _id: doc._id.toString(),
      location: (doc.location as string) || 'Unknown Location',
      spots: Array.isArray(doc.spots) ? (doc.spots as string[]) : [],
      narrative: (doc.narrative as string) || '',
      audioUrl: typeof doc.audioUrl === 'string' ? doc.audioUrl : undefined,
      model: typeof doc.model === 'string' ? doc.model : undefined,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(),
    };
  } catch (err) {
    console.warn('Failed to fetch quest by id from MongoDB Atlas:', err);
    return null;
  }
}

export async function getRecentQuests(limit = 12): Promise<QuestRecord[]> {
  try {
    const db = await getDatabase();
    if (!db) return [];
    const results = await db
      .collection('quests')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return results.map((doc) => {
      const id = doc._id?.toString() || '';
      const rawAudio = typeof doc.audioUrl === 'string' ? doc.audioUrl : undefined;
      // Optimize bandwidth: If raw audio is a base64 Data URI, provide clean audio endpoint URL
      let audioUrl = rawAudio;
      if (rawAudio && rawAudio.startsWith('data:audio') && id) {
        audioUrl = `/api/quest?id=${id}&audio=1`;
      }

      return {
        _id: id,
        location: (doc.location as string) || 'Unknown Location',
        spots: Array.isArray(doc.spots) ? (doc.spots as string[]) : [],
        narrative: (doc.narrative as string) || '',
        audioUrl,
        model: typeof doc.model === 'string' ? doc.model : undefined,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch recent quests from MongoDB Atlas:', err);
    return [];
  }
}

export default clientPromise;
