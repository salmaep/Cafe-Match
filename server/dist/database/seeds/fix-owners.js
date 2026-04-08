"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
const bcrypt = __importStar(require("bcrypt"));
dotenv.config();
async function run() {
    const ds = new typeorm_1.DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'cafematch',
    });
    await ds.initialize();
    const hash = await bcrypt.hash('password123', 10);
    const cafes = [
        { id: 1, ownerEmail: 'owner.gormeteria@demo.id', ownerName: 'Owner Gormeteria' },
        { id: 2, ownerEmail: 'owner.herbspice@demo.id', ownerName: 'Owner Herb Spice' },
        { id: 3, ownerEmail: 'owner.cremelin@demo.id', ownerName: 'Owner Cremelin' },
        { id: 4, ownerEmail: 'owner.studio69@demo.id', ownerName: 'Owner Studio69' },
        { id: 5, ownerEmail: 'owner.kalika@demo.id', ownerName: 'Owner Kalika' },
        { id: 6, ownerEmail: 'owner.paskal@demo.id', ownerName: 'Owner Paskal' },
    ];
    for (const c of cafes) {
        const [existing] = await ds.query('SELECT id FROM users WHERE email = ?', [c.ownerEmail]);
        let ownerId;
        if (existing) {
            ownerId = existing.id;
        }
        else {
            const res = await ds.query('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [c.ownerEmail, hash, c.ownerName, 'owner']);
            ownerId = res.insertId;
            console.log(`Created user ${c.ownerName} (id=${ownerId})`);
        }
        await ds.query('UPDATE cafes SET owner_id = ? WHERE id = ?', [ownerId, c.id]);
        console.log(`Cafe ${c.id} -> owner ${ownerId} (${c.ownerName})`);
    }
    console.log('\nDone! Olive (id=2) now only owns cafe 100 (Blue Turtle).');
    await ds.destroy();
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=fix-owners.js.map