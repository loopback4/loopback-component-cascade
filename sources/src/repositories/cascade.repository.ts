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
             * Get target repository, model, relation, options methods
             */
            private getTargetRepository(relation: string) {
                return (this as any)
                    [relation]()
                    .getTargetRepository() as DefaultCrudRepository<
                    any,
                    any,
                    any
                >;
            }

            private getTargetRelation(relation: string) {
                return this.entityClass.definition.relations[relation] as any;
            }

            private getTargetModel(
                relation: string,
                parent: Model,
                model: any
            ) {
                const targetRelation = this.getTargetRelation(relation);

                return {
                    ...model,
                    [targetRelation.keyTo]: (parent as any)[
                        targetRelation.keyFrom
                    ],
                };
            }

            private getTargetOptions(
                relation: string,
                options?: CascadeOptions
            ) {
                const include = options?.filter?.include || [];
                const target = include
                    .filter((inclusion) => inclusion.relation === relation)
                    .map((inclusion) => inclusion.scope)
                    .reduce((_, filter) => filter, undefined);

                return {
                    ...options,
                    filter: target,
                } as CascadeOptions;
            }

            /**
             * Create methods
             */
            async create(
                entity: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<Model> {
                /**
                 * 1. Create parent model
                 */
                let result = await super.create(entity, options);

                /**
                 * 1. Find children models
                 * 2. Filter children without relation
                 * 3. Map children and create them
                 */
                /**
                 * TODO Check:
                 *  Foreach children in parent:
                 *      1. Target relation: this.entityClass.definition[relation]
                 *      2. Target repository: this[relation]().getTargetRepository()
                 */
                const children = Object.entries(entity)
                    .filter(([_, value]) => typeof value === "object")
                    .filter(([key, _]) => key in this.entityClass.definition)
                    .map(async ([key, value]) => {
                        const targetRepository = this.getTargetRepository(key);
                        const targetOptions = this.getTargetOptions(
                            key,
                            options
                        );

                        if (Array.isArray(value)) {
                            const targetModels = value.map((item) =>
                                this.getTargetModel(key, result, item)
                            );

                            (result as any)[
                                key
                            ] = await targetRepository.createAll(
                                targetModels,
                                targetOptions
                            );
                        } else {
                            const targetModel = this.getTargetModel(
                                key,
                                result,
                                value
                            );

                            (result as any)[
                                key
                            ] = await targetRepository.create(
                                targetModel,
                                targetOptions
                            );
                        }
                    });
                await Promise.all(children);

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
            ): Promise<Count> {
                /**
                 * 1. Find children models
                 * 2. Filter children without relation
                 * 3. Map children and create them
                 */
                const children = (options?.filter?.include || []).map(
                    async ({ relation, scope }) => {
                        const targetRepository = this.getTargetRepository(
                            relation
                        );
                        const targetOptions = this.getTargetOptions(
                            relation,
                            options
                        );

                        return await targetRepository.deleteAll(
                            scope?.where,
                            targetOptions
                        );
                    }
                );

                /**
                 * 1. Delete parent model
                 */
                return super.deleteAll(where, options);
            }
            async deleteById(
                id: ModelID,
                options?: CascadeOptions
            ): Promise<void> {
                await this.deleteAll(
                    {
                        [this.entityClass.getIdProperties()[0]]: id,
                    } as any,
                    options
                );
            }
        }

        return Repository as any;
    };
}
