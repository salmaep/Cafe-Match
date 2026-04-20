"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRecap = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
let UserRecap = class UserRecap {
    id;
    userId;
    year;
    recapData;
    generatedAt;
    user;
};
exports.UserRecap = UserRecap;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], UserRecap.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unsigned: true }),
    __metadata("design:type", Number)
], UserRecap.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', unsigned: true }),
    __metadata("design:type", Number)
], UserRecap.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recap_data', type: 'json' }),
    __metadata("design:type", Object)
], UserRecap.prototype, "recapData", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'generated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], UserRecap.prototype, "generatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserRecap.prototype, "user", void 0);
exports.UserRecap = UserRecap = __decorate([
    (0, typeorm_1.Entity)('user_recaps'),
    (0, typeorm_1.Index)('idx_recap_user_year', ['userId', 'year'], { unique: true })
], UserRecap);
//# sourceMappingURL=user-recap.entity.js.map