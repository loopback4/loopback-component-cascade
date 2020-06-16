import {
    juggler,
    Class,
    Entity,
    DefaultCrudRepository,
    DataObject,
    Options,
    Filter,
    Where,
    Count,
    EntityNotFoundError,
} from "@loopback/repository";

import { Ctor } from "../types";

export interface CascadeOptions extends Options {
    filter?: Filter;
}

/**
 * Repository Type
 */
export interface CascadeRepository<
    Model extends Entity,
    ModelID,
    ModelRelations extends object = {}
> extends DefaultCrudRepository<Model, ModelID, ModelRelations> {}

/**
 * Repository Mixin
 */
export function CascadeRepositoryMixin<
    Model extends Entity,
    ModelID,
    ModelRelations extends object = {}
>() {
    /**
     * Return function with generic type of repository class, returns mixed in class
     *
     * bugfix: optional type, load type from value
     */
    return function <
        RepositoryClass extends Class<
            DefaultCrudRepository<Model, ModelID, ModelRelations>
        >
    >(
        superClass?: RepositoryClass
    ): RepositoryClass &
        Class<CascadeRepository<Model, ModelID, ModelRelations>> {
        const parentClass: Class<DefaultCrudRepository<
            Model,
            ModelID,
            ModelRelations
        >> = superClass || DefaultCrudRepository;

        class Repository extends parentClass
            implements CascadeRepository<Model, ModelID, ModelRelations> {
            constructor(ctor: Ctor<Model>, dataSource: juggler.DataSource) {
                super(ctor, dataSource);
            }

            /**
             * Create methods
             */
            async create(
                entity: Model,
                options?: CascadeOptions
            ): Promise<Model> {
                return super.create(entity, options);
            }
            async createAll(
                entities: DataObject<Model>[],
                options?: CascadeOptions
            ): Promise<Model[]> {}

            /**
             * Update methods
             */
            async update(
                entity: Model,
                options?: CascadeOptions
            ): Promise<void>;
            async updateAll(
                data: DataObject<Model>,
                where?: Where<Model>,
                options?: CascadeOptions
            ): Promise<Count>;
            async updateById(
                id: ModelID,
                data: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<void>;
            async replaceById(
                id: ModelID,
                data: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<void>;

            /**
             * Delete methods
             */
            async delete(
                entity: Model,
                options?: CascadeOptions
            ): Promise<void>;
            async deleteAll(
                where?: Where<Model>,
                options?: CascadeOptions
            ): Promise<Count>;
            async deleteById(
                id: ModelID,
                options?: CascadeOptions
            ): Promise<void>;
        }

        return Repository as any;
    };
}
