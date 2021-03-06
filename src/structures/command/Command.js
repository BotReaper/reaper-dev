const { Hex, Embed } = require('../../')
const CommandError = require('./CommandError.js')
const CommandRequirements = require('./CommandRequirements.js')
const CommandParameters = require('./parameters/CommandParameters.js')

/**
 * Base command structure.
 * @constructor
 * @param {Reaper} client - Reaper client
 */

module.exports = class CommandManager {
    constructor (client, options = {}) {
        this.client = client

        this.name = options.name || 'invalid'
        this.aliases = options.aliases || []
        this.category = options.category || 'general'


        this.subcommands = options.subcommands || []

        this.requirements = options.requirements
        this.parameters = options.parameters

        this.cooldownTime = 0
        this.cooldownFeedback = true
        this.cooldownMap = this.cooldownTime > 0 ? new Map() : null

        this.parentCommand = options.parentCommand
    }

    /**
     * Returns true if it can load
     * @returns {boolean} Whether this command can load
     */
    canLoad () {
        return true
    }

    /**
     * Pre-executes itself
     * @param {Message} message Message that triggered it
     * @param {Array<string>} args Command arguments
     */
    async _run (context, args) {
        try {
            this.handleRequirements(context, args)
        } catch (e) {
            return this.error(context, e)
        }

        const [ subcmd ] = args
        const subcommand = this.subcommands.find(c => c.name.toLowerCase() === subcmd || (c.aliases && c.aliases.includes(subcmd)))
        if (subcommand) {
            return subcommand._run(context, args.splice(1))
        }

        try {
            args = await this.handleParameters(context, args)
        } catch (e) {
            return this.error(context, e)
        }

        this.applyCooldown(context.author)

        try {
            const result = await this.run(context, ...args)
            return result
        } catch (e) {
            this.error(context, e)
        }
    }

    /**
     * Executes itself
     * @param {Message} message Message that triggered it
     * @param {Array<string>} args Command arguments
     */
    async run () {}

    /**
     * Returns true if it can run
     * @param {Message} message Message that triggered it
     * @param {Array<string>} args Command arguments
     * @returns {boolean} Whether this command can run
     */
    handleRequirements (context, args) {
        return this.requirements ? CommandRequirements.handle(context, this.requirements, args) : true
    }

    handleParameters (context, args) {
        return this.parameters ? CommandParameters.handle(context, this.parameters, args) : args
    }

    /**
     * Apply command cooldown to an user
     * @param {User} user User that triggered it
     * @param {number} time Cooldown time in seconds
     */
    applyCooldown (user, time) {
        if (!user || !this.cooldownTime > 0) return false
        if (!this.cooldownMap.has(user.id)) {
            this.cooldownMap.set(user.id, Date.now())
            user.client.setTimeout(() => this.cooldownMap.delete(user.id), time * 1000)
        }
    }

    error ({ t, author, channel, prefix }, error) {
        if (error instanceof CommandError) {
            const usage = this.usage(t, prefix)
            const embed = error.embed || new Embed(author)
                .setTitle(error.message)
                .setDescription(error.showUsage ? usage : '')
            return channel.send(embed.setColor(Hex.redColor())).then(() => channel.stopTyping())
        }
        console.error(error)
    }

    get tPath () {
        return this.parentCommand ? `${this.parentCommand.tPath}.subcommands.${this.name}` : `${this.name}`
    }

    get fullName () {
        return this.parentCommand ? `${this.parentCommand.fullName} ${this.name}` : this.name
    }

    usage (t, prefix, noUsage = true, onlyCommand = false) {
        const usagePath = `${this.tPath}.commandUsage`
        const usage = noUsage ? t(`commands:${usagePath}`) : t([`commands:${usagePath}`, ''])
        if (usage !== usagePath && !onlyCommand) {
            return `**${t('commons:usage')}:** \`${prefix}${this.fullName}${usage ? ' ' + usage : ''}\``
        } else if (usage !== usagePath && onlyCommand) {
            return `${prefix}${this.fullName}${usage ? ' ' + usage : ''}`
        }
    }
}