import React, {useEffect, useState} from 'react';
import {useMutation, useQuery} from '@apollo/client';
import gql from 'graphql-tag';
import {useTranslation} from 'react-i18next';
import {useNotifications} from '@jahia/react-material';
import {
    Accordion,
    AccordionItem,
    Badge,
    Button,
    Cancel,
    Chip,
    Close,
    Information,
    Loader,
    Power,
    Reload,
    Rocket,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeadCell,
    TableRow,
    Typography
} from '@jahia/moonstone';
import styles from './ModuleManagementCommunityApp.scss';
import {Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, TableSortLabel} from '@material-ui/core';
import * as PropTypes from 'prop-types';
import dayjs from 'dayjs';
import Mermaid from './Mermaid';
import BundleDescriptionList from './BundleDescriptionList';

const descendingComparator = (a, b, orderBy) => {
    if (!a[orderBy] && !b[orderBy]) {
        return 0;
    }

    if (!b[orderBy] || b[orderBy] < a[orderBy]) {
        return -1;
    }

    if (!a[orderBy] || b[orderBy] > a[orderBy]) {
        return 1;
    }

    return 0;
};

export const getComparator = (order, orderBy) => {
    return order === 'desc' ?
        (a, b) => descendingComparator(a, b, orderBy) :
        (a, b) => -descendingComparator(a, b, orderBy);
};

const BundleDetails = ({bundle, t, close}) => {
    return (
        <>
            <DialogActions>
                <Button variant="outlined"
                        size="big"
                        color="accent"
                        label={t('label.close')}
                        icon={<Close/>}
                        isDisabled={false}
                        className={styles.button}
                        onClick={() => close(false)}/>
            </DialogActions>
            <DialogContent className={styles.maxHeight}>
                <Accordion id="bundle" defaultOpenedItem="details" className={styles.maxHeight}>
                    <AccordionItem id="details" label="Details">
                        <div className={styles.maxHeight}>
                            <BundleDescriptionList bundle={bundle}/>
                        </div>
                    </AccordionItem>
                    {bundle.sitesDeployment.length > 0 && (
                        <AccordionItem id="sitesDeployment" label="Deployed on sites">
                            <div className={styles.maxHeight}>
                                <ul>
                                    {bundle.sitesDeployment.map(site => (
                                        <Typography key={site} variant="body" weight="semiBold">
                                            {site}
                                        </Typography>
                                    ))}
                                </ul>
                            </div>
                        </AccordionItem>)}
                    {bundle.dependenciesGraph && bundle.dependenciesGraph.length > 0 && (
                        <AccordionItem id="bundleDependencies" label="Bundle dependencies">
                            <div className={styles.maxHeight}>
                                <Mermaid>
                                    {bundle.dependenciesGraph}
                                </Mermaid>
                            </div>
                        </AccordionItem>)}
                    {bundle.moduleDependencies && bundle.moduleDependencies.length > 0 && (
                        <AccordionItem id="moduleDependencies" label="Module dependencies">
                            <div className={styles.maxHeight}>
                                <Mermaid>
                                    {bundle.moduleDependenciesGraph}
                                </Mermaid>
                            </div>
                        </AccordionItem>
                    )}
                </Accordion>
            </DialogContent>
        </>
    );
};

BundleDetails.propTypes = {
    bundle: PropTypes.object,
    t: PropTypes.func,
    close: PropTypes.func
};

const ModuleRow = ({module, t}) => {
    const notificationContext = useNotifications();
    const [open, setOpen] = useState(false);
    const {data, error, loading, refetch} = useQuery(gql`query ($module: String!) {
        admin {
            modulesManagement {
                bundle(name: $module) {
                    symbolicName
                    bundleId
                    state
                    version
                    manifest {
                        key
                        value
                    }
                    dependencies
                    dependenciesGraph(depth:2)
                    moduleDependencies
                    moduleDependenciesGraph
                    nodeTypesDependencies
                    license
                    services
                    servicesInUse
                    sitesDeployment
                }
            }
        }
    }`, {fetchPolicy: 'cache-and-network', variables: {module: module.name}});

    const [stopBundle] = useMutation(gql`mutation ($bundleId: Long!) {
        admin {
            modulesManagement {
                bundle(bundleId: $bundleId) {
                    stop
                }
            }
        }
    }`, {variables: {bundleId: data?.admin?.modulesManagement?.bundle?.bundleId}});

    const handleStopBundle = async () => {
        try {
            await stopBundle();
            notificationContext.notify(t('label.stopBundleSuccess'), ['closeButton', 'noAutomaticClose']);
            await refetch();
        } catch (e) {
            console.error('Error stopping bundle:', e);
            notificationContext.notify(t('label.stopBundleError'), ['closeButton', 'noAutomaticClose']);
        }
    };

    const [startBundle] = useMutation(gql`mutation ($bundleId: Long!) {
        admin {
            modulesManagement {
                bundle(bundleId: $bundleId) {
                    start
                }
            }
        }
    }`, {variables: {bundleId: data?.admin?.modulesManagement?.bundle?.bundleId}});

    const handleStartBundle = async () => {
        try {
            await startBundle();
            notificationContext.notify(t('label.startBundleSuccess'), ['closeButton', 'noAutomaticClose']);
            await refetch();
        } catch (e) {
            console.error('Error starting bundle:', e);
            notificationContext.notify(t('label.startBundleError'), ['closeButton', 'noAutomaticClose']);
        }
    };

    const [refreshBundle] = useMutation(gql`mutation ($bundleId: Long!) {
        admin {
            modulesManagement {
                bundle(bundleId: $bundleId) {
                    refresh
                }
            }
        }
    }`, {variables: {bundleId: data?.admin?.modulesManagement?.bundle?.bundleId}});

    const handleRefreshBundle = async () => {
        try {
            await refreshBundle();
            notificationContext.notify(t('label.startBundleSuccess'), ['closeButton', 'noAutomaticClose']);
            await refetch();
        } catch (e) {
            console.error('Error starting bundle:', e);
            notificationContext.notify(t('label.startBundleError'), ['closeButton', 'noAutomaticClose']);
        }
    };

    if (loading || error) {
        console.error('Error when fetching module data: ' + error);
        return <TableRow><TableBodyCell colSpan={4}>{t('label.errors.loadingModuleData')}</TableBodyCell></TableRow>;
    }

    const bundle = data.admin.modulesManagement.bundle;
    if (!bundle) {
        return (
            <TableRow>
                <TableBodyCell colSpan={4}>
                    {t('label.errors.moduleNotFound', {module})}
                </TableBodyCell>
            </TableRow>
        );
    }

    return (
        <TableRow>
            <TableBodyCell>
                <Typography variant="subheading" weight="semiBold">
                    {bundle.symbolicName} [{bundle.bundleId}]
                </Typography>
            </TableBodyCell>
            <TableBodyCell>
                <Badge label={bundle.version} color="accent"/>
            </TableBodyCell>
            <TableBodyCell>
                <Chip variant="bright"
                      label={bundle.state}
                      color={bundle.state === 'ACTIVE' ? 'success' : 'danger'}
                      icon={<Rocket/>}/>
            </TableBodyCell>
            <TableBodyCell>
                <div className={styles.actionGroup} style={{width: 'fit-content'}}>
                    {bundle.state === 'RESOLVED' && <Button variant="outlined"
                                                            size="big"
                                                            color="success"
                                                            label=""
                                                            icon={<Power/>}
                                                            isDisabled={false}
                                                            className={styles.button}
                                                            onClick={handleStartBundle}/>}
                    {bundle.state === 'ACTIVE' && (
                        <>
                            <Button variant="outlined"
                                    size="big"
                                    color="danger"
                                    label=""
                                    icon={<Cancel/>}
                                    isDisabled={false}
                                    className={styles.button}
                                    onClick={handleStopBundle}/>
                            <Button variant="outlined"
                                    size="big"
                                    color="danger"
                                    label=""
                                    icon={<Reload/>}
                                    isDisabled={false}
                                    className={styles.button}
                                    onClick={handleRefreshBundle}/>
                        </>
                    )}
                    <Button variant="outlined"
                            size="big"
                            color="accent"
                            label="Show details"
                            icon={<Information/>}
                            isDisabled={false}
                            className={styles.button}
                            onClick={() => setOpen(true)}/>
                </div>
                <Dialog fullWidth open={open} maxWidth="100vw" maxHeight="100vw" onClose={() => setOpen(false)}>
                    <BundleDetails bundle={bundle} t={t} close={setOpen}/>
                </Dialog>
            </TableBodyCell>
        </TableRow>
    );
};

ModuleRow.propTypes = {
    module: PropTypes.any,
    t: PropTypes.func
};

const ModuleManagementCommunityApp = () => {
    const notificationContext = useNotifications();
    const {t} = useTranslation('module-management-community');
    const [order, setOrder] = React.useState('asc');
    const [orderBy, setOrderBy] = React.useState('name');
    const [updates, setUpdates] = React.useState([]);
    const [modules, setModules] = React.useState([]);
    const [filter, setFilter] = useState('');
    const {data: initialData, error: initialError, loading: initialLoading} = useQuery(gql`query {
        admin {
            modulesManagement {
                installedModules
            }
        }
    }`, {fetchPolicy: 'cache-and-network'});

    const {data, error, loading, refetch} = useQuery(gql`query {
        admin {
            modulesManagement {
                availableUpdates
                lastUpdateTime
            }
        }
    }`, {fetchPolicy: 'cache-and-network', initialFetchPolicy: 'standby'});

    const [updateAll] = useMutation(gql`mutation {
        admin {
            modulesManagement {
                updateModules
            }
        }
    }`);

    useEffect(() => {
        if (data && data.admin && data.admin.modulesManagement && data.admin.modulesManagement.availableUpdates) {
            const availableUpdates = data.admin.modulesManagement.availableUpdates.map((module => ({
                name: module.substring(0, module.indexOf('/')).trim(),
                version: module.substring(module.indexOf('/') + 1, module.indexOf(':')).trim(),
                available: module.substring(module.indexOf(':') + 1).trim()
            })));
            setUpdates(availableUpdates);
        }
    }, [data, order, orderBy]);

    useEffect(() => {
        if (initialData && initialData.admin && initialData.admin.modulesManagement && initialData.admin.modulesManagement.installedModules) {
            const installedModules = initialData.admin.modulesManagement.installedModules.map((module => ({
                name: module.substring(0, module.indexOf('/')).trim(),
                version: module.substring(module.indexOf('/') + 1, module.indexOf(':')).trim(),
                state: module.substring(module.indexOf(':') + 1).trim()
            })));
            installedModules.sort(getComparator(order, orderBy));
            setModules(installedModules);
        }
    }, [initialData, order, orderBy]);

    if (error || initialError) {
        console.log('Error when fetching data: ' + error);
        notificationContext.notify(t('label.errors.loadingVanityUrl'), ['closeButton', 'noAutomaticClose']);
        return <>error</>;
    }

    if (initialLoading || loading) {
        return (
            <Card>
                <CardHeader title={
                    <Typography className={styles.title} variant="heading" weight="semiBold">
                        {t('label.table.title')}
                    </Typography>
                }/>
                <CardContent className={styles.flexCenter}>
                    <div className={styles.flex}>
                        <Loader size="big"/>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const handleClick = async () => {
        notificationContext.notify(t('label.fetchUpdates'), ['closeButton', 'noAutomaticClose']);
        await refetch();
    };

    if (modules.length === 0) {
        return (
            <Card>
                <CardHeader title={
                    <Typography className={styles.title} variant="heading" weight="semiBold">
                        {t('label.table.title')}
                    </Typography>
                }/>
                <CardContent className={styles.flexCenter}>
                    <div className={styles.flex}>
                        <Typography variant="body" weight="semiBold">
                            {t('label.noUpdatesAvailable')}
                        </Typography>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const handleSort = property => {
        const isAsc = orderBy === property && order === 'asc';
        const sortOrder = isAsc ? 'desc' : 'asc';
        setOrderBy(property);
        const siteNodes = [...modules];
        siteNodes.sort(getComparator(sortOrder, property));
        setOrder(sortOrder);
        setOrderBy(property);
        setModules(siteNodes);
    };

    const handleUpdateAll = async () => {
        try {
            await updateAll();
            notificationContext.notify(t('label.updateAllSuccess'), ['closeButton', 'noAutomaticClose']);
            await refetch();
        } catch (e) {
            console.error('Error updating all modules:', e);
            notificationContext.notify(t('label.updateAllError'), ['closeButton', 'noAutomaticClose']);
        }
    };

    // Filter modules by symbolicName (case-insensitive)
    const filteredModules = modules.filter(
        m => filter.trim() === '' ? true : m.name.toLowerCase().includes(filter.trim().toLowerCase())
    );

    const tableHead = () => {
        return (
            <TableHead>
                <TableRow>
                    <TableHeadCell>
                        <TableSortLabel
                            active={orderBy === 'name'}
                            classes={{icon: orderBy === 'name' ? styles.iconActive : styles.icon}}
                            direction={orderBy === 'name' ? order : 'asc'}
                            onClick={() => handleSort('name')}
                        >
                            <Typography variant="body"
                                        weight="semiBold"
                            >{t('label.table.cells.name')}
                            </Typography>
                        </TableSortLabel>
                    </TableHeadCell>
                    <TableHeadCell>
                        <TableSortLabel
                            active={orderBy === 'version'}
                            classes={{icon: orderBy === 'version' ? styles.iconActive : styles.icon}}
                            direction={orderBy === 'version' ? order : 'asc'}
                            onClick={() => handleSort('version')}
                        >
                            <Typography variant="body"
                                        weight="semiBold"
                            >{t('label.table.cells.version')}
                            </Typography>
                        </TableSortLabel>
                    </TableHeadCell>
                    <TableHeadCell>
                        <TableSortLabel
                            active={orderBy === 'state'}
                            classes={{icon: orderBy === 'state' ? styles.iconActive : styles.icon}}
                            direction={orderBy === 'state' ? order : 'asc'}
                            onClick={() => handleSort('state')}
                        >
                            <Typography variant="body"
                                        weight="semiBold"
                            >{t('label.table.cells.state')}
                            </Typography>
                        </TableSortLabel>
                    </TableHeadCell>
                    <TableHeadCell>
                        <Typography variant="body"
                                    weight="semiBold"
                        >{t('label.table.actions')}
                        </Typography>
                    </TableHeadCell>
                </TableRow>
            </TableHead>
        );
    };

    return (
        <Card>
            <CardHeader title={
                <Typography className={styles.title} variant="heading" weight="semiBold">
                    {t('label.table.title')}
                </Typography>
            }
                        action={
                            <div className={styles.actionGroup}>
                                <input
                                    type="text"
                                    placeholder="Filter by symbolic name"
                                    value={filter}
                                    style={{marginRight: 16}}
                                    onChange={e => setFilter(e.target.value)}
                                />
                                <Typography variant="subheading" weight="bold">
                                    {t('label.lastUpdate', {date: dayjs(data.admin.modulesManagement.lastUpdateTime).format('DD/MM/YYYY HH:mm')})}
                                </Typography>
                                <Button variant="outlined"
                                        size="big"
                                        color="accent"
                                        label={t('label.refresh')}
                                        icon={<Reload/>}
                                        isDisabled={false}
                                        className={styles.button}
                                        onClick={handleClick}/>
                                <Button variant="outlined"
                                        size="big"
                                        color="danger"
                                        label={t('label.updateAll')}
                                        icon={<Reload/>}
                                        isDisabled={updates.length === 0}
                                        className={styles.button}
                                        onClick={handleUpdateAll}/>
                            </div>
                        }
                        classes={{action: styles.action}}
            />
            <CardContent>
                <Table>
                    {tableHead()}
                    <TableBody>
                        {filteredModules.map(module => (
                            <ModuleRow key={module.name} module={module} t={t}/>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default ModuleManagementCommunityApp;
