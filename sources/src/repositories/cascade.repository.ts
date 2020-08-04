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
    RelationMetadata,
} from "@loopback/repository";

import { Ctor } from "../types";

export interface CascadeOptions extends Options {
    filter?: Filter;
    models?: any[];
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
             * Get target repository from inclusionResolvers
             */
            private getTargetRepository(relation: string) {
                if (!(relation in this)) {
                    return undefined;
                }

                return (this as any)
                    [relation]()
                    .getTargetRepository() as DefaultCrudRepository<
                    any,
                    any,
                    any
                >;
            }

            /**
             * Get target relation from entityClass
             */
            private getTargetRelation(relation: string) {
                if (!(relation in this.entityClass.definition.relations)) {
                    return undefined;
                }

                return this.entityClass.definition.relations[
                    relation
                ] as RelationMetadata;
            }

            /**
             * Get target where from options
             */
            private getTargetWhere(relation: string, options?: CascadeOptions) {
                const targetEntity = this.getTargetRelation(relation)?.target();

                return targetEntity?.buildWhereForId({
                    inq: (options?.models || []).map((model) =>
                        targetEntity?.getIdOf(model)
                    ),
                });
            }

            /**
             * Get target model with relation keys
             */
            private getTargetModel(relation: string, parent: any, child: any) {
                const targetRelation = this.getTargetRelation(relation);
                if (!targetRelation) {
                    return undefined;
                }

                return {
                    ...child,
                    [targetRelation.keyTo]: parent[targetRelation.keyFrom],
                } as Model;
            }

            /**
             * Get target options with filter, models
             */
            private getTargetOptions(
                relation: string,
                options?: CascadeOptions
            ) {
                if (!options) {
                    return undefined;
                }

                return {
                    ...options,
                    filter: (options.filter?.include || [])
                        .filter((inclusion) => inclusion.relation === relation)
                        .reduce<any>(
                            (_, inclusion) => inclusion.scope,
                            undefined
                        ),
                    models: (options.models || [])
                        .map((model) => model[relation])
                        .filter((model) => model)
                        .flat(1),
                } as CascadeOptions;
            }

            /**
             * Create methods
             */
            async create(
                entity: DataObject<Model>,
                options?: CascadeOptions
            ): Promise<Model> {
                let result = await super.create(entity, options);

                const children = Object.entries(entity)
                    .filter(([_, value]) => typeof value === "object")
                    .map(([key, value]) => ({
                        relation: key,
                        repository: this.getTargetRepository(key),
                        options: this.getTargetOptions(key, options),
                        models: Array.isArray(value)
                            ? value.map((item) =>
                                  this.getTargetModel(key, result, item)
                              ).filter
                            : this.getTargetModel(key, result, value),
                    }))
                    .filter(({ repository, models }) => repository && models)
                    .map(async ({ relation, repository, options, models }) => {
                        if (Array.isArray(models)) {
                            (result as any)[
                                relation
                            ] = await repository?.createAll(models, options);
                        } else {
                            (result as any)[
                                relation
                            ] = await repository?.create(models, options);
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
            // async updateAll(
            //     data: DataObject<Model>,
            //     where?: Where<Model>,
            //     options?: CascadeOptions
            // ): Promise<Count> {}
            // async updateById(
            //     id: ModelID,
            //     data: DataObject<Model>,
            //     options?: CascadeOptions
            // ): Promise<void> {}
            // async replaceById(
            //     id: ModelID,
            //     data: DataObject<Model>,
            //     options?: CascadeOptions
            // ): Promise<void> {}

            /**
             * Delete methods
             */
            async deleteAll(
                where?: Where<Model>,
                options?: CascadeOptions
            ): Promise<Count> {
                if (options && !options.models) {
                    const idProperty = this.entityClass.getIdProperties()[0];

                    options.models = await super.find(
                        options.filter as any,
                        options
                    );
                    where = {
                        [idProperty]: {
                            inq: options.models.map(
                                (model) => model[idProperty]
                            ),
                        },
                    } as any;
                }

                let result = await super.deleteAll(where, options);

                const children = (options?.filter?.include || []).map(
                    async ({ relation, scope }) => {
                        const targetRepository = this.getTargetRepository(
                            relation
                        );
                        const targetOptions = this.getTargetOptions(
                            relation,
                            options
                        );

                        // return await targetRepository?.deleteAll(
                        //     ?,
                        //     targetOptions
                        // );
                    }
                );

                return {
                    count: (await Promise.all(children)).reduce(
                        (accumulate, item) => accumulate + (item?.count || 0),
                        result.count
                    ),
                };
            }
            async deleteById(
                id: ModelID,
                options?: CascadeOptions
            ): Promise<void> {
                await this.deleteAll(
                    this.entityClass.buildWhereForId(id),
                    options
                );
            }
        }

        return Repository as any;
    };
}
