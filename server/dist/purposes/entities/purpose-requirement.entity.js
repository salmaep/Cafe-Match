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
exports.PurposeRequirement = void 0;
const typeorm_1 = require("typeorm");
const purpose_entity_1 = require("./purpose.entity");
let PurposeRequirement = class PurposeRequirement {
    id;
    purposeId;
    facilityKey;
    isMandatory;
    weight;
    purpose;
};
exports.PurposeRequirement = PurposeRequirement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], PurposeRequirement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purpose_id', unsigned: true }),
    __metadata("design:type", Number)
], PurposeRequirement.prototype, "purposeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'facility_key', length: 50 }),
    __metadata("design:type", String)
], PurposeRequirement.prototype, "facilityKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_mandatory', default: false }),
    __metadata("design:type", Boolean)
], PurposeRequirement.prototype, "isMandatory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', unsigned: true, default: 1 }),
    __metadata("design:type", Number)
], PurposeRequirement.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purpose_entity_1.Purpose, (purpose) => purpose.requirements, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'purpose_id' }),
    __metadata("design:type", purpose_entity_1.Purpose)
], PurposeRequirement.prototype, "purpose", void 0);
exports.PurposeRequirement = PurposeRequirement = __decorate([
    (0, typeorm_1.Entity)('purpose_requirements'),
    (0, typeorm_1.Unique)(['purpose', 'facilityKey'])
], PurposeRequirement);
//# sourceMappingURL=purpose-requirement.entity.js.map