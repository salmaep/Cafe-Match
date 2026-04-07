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
exports.Purpose = void 0;
const typeorm_1 = require("typeorm");
const purpose_requirement_entity_1 = require("./purpose-requirement.entity");
let Purpose = class Purpose {
    id;
    slug;
    name;
    description;
    icon;
    displayOrder;
    requirements;
};
exports.Purpose = Purpose;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ unsigned: true }),
    __metadata("design:type", Number)
], Purpose.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], Purpose.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Purpose.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Purpose.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], Purpose.prototype, "icon", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_order', type: 'smallint', unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], Purpose.prototype, "displayOrder", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purpose_requirement_entity_1.PurposeRequirement, (req) => req.purpose, { cascade: true }),
    __metadata("design:type", Array)
], Purpose.prototype, "requirements", void 0);
exports.Purpose = Purpose = __decorate([
    (0, typeorm_1.Entity)('purposes')
], Purpose);
//# sourceMappingURL=purpose.entity.js.map