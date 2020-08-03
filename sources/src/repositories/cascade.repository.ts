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
    RelationMetadata,
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
                entity: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<Model> {
                let result = await super.create(entity, options);

                /** Create nested models */
                const relations = Object.entries(entity).filter(
                    ([_, value]) => typeof value === "object"
                );

                for (let [relation, models] of relations) {
                    const target: DefaultCrudRepository<
                        any,
                        any,
                        any
                    > = (this as any)[relation]().getTargetRepository();
                    const relation: RelationMetadata = this.entityClass.definition.relations[]

                    if (Array.isArray(models)) {

                        (result as any)[relation] = await target.createAll(
                            models.map((model) => ({
                                ...model,
                                keyFrom: result["keyTo"],
                            })),
                            options
                        );

                        (result as any)[key] = this.createAll(
                            {
                                ...value,
                                relationId: (result as any)["relationId"],
                            },
                            options
                        );
                    } else {
                        (result as any)[key] = this.create(
                            {
                                ...value,
                                relationId: (result as any)["relationId"],
                            },
                            options
                        );
                    }
                }

                return result;
            }
            async createAll(
                entities: DataObject<Model>[],
                options?: CascadeOptions
            ): Promise<Model[]> {
                return Promise.all(
                    entities.map((entity) => this.create(entity, options))
                );
            }

            /**
             * Update methods
             */
            async updateAll(
                data: DataObject<Model>,
                where?: Where<Model>,
                options?: CascadeOptions
            ): Promise<Count> {}
            async updateById(
                id: ModelID,
                data: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<void> {}
            async replaceById(
                id: ModelID,
                data: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<void> {}

            /**
             * Delete methods
             */
            async deleteAll(
                where?: Where<Model>,
                options?: CascadeOptions
            ): Promise<Count> {}
            async deleteById(
                id: ModelID,
                options?: CascadeOptions
            ): Promise<void> {}
        }

        return Repository as any;
    };
}
