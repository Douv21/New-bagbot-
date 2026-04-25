const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Gérer les messages de bienvenue et d\'au revoir')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configurer le système de bienvenue')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon des messages de bienvenue')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Message de bienvenue')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('Configurer le système d\'au revoir')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon des messages d\'au revoir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Message d\'au revoir')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Tester les messages de bienvenue')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await setupWelcome(interaction);
                break;
            case 'goodbye':
                await setupGoodbye(interaction);
                break;
            case 'test':
                await testWelcome(interaction);
                break;
        }
    }
};

async function setupWelcome(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Bienvenue {user} sur {server} !';

    const guild = await database.getGuild(interaction.guild.id);
    guild.welcome = {
        enabled: true,
        channelId: channel.id,
        message: message
    };

    await database.setGuild(interaction.guild.id, guild);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Configuration de bienvenue')
        .setDescription('Le système de bienvenue a été configuré avec succès !')
        .addFields(
            { name: 'Salon', value: `<#${channel.id}>`, inline: true },
            { name: 'Message', value: message, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function setupGoodbye(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Au revoir {user} !';

    const guild = await database.getGuild(interaction.guild.id);
    guild.goodbye = {
        enabled: true,
        channelId: channel.id,
        message: message
    };

    await database.setGuild(interaction.guild.id, guild);

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('✅ Configuration d\'au revoir')
        .setDescription('Le système d\'au revoir a été configuré avec succès !')
        .addFields(
            { name: 'Salon', value: `<#${channel.id}>`, inline: true },
            { name: 'Message', value: message, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function testWelcome(interaction) {
    const guild = await database.getGuild(interaction.guild.id);
    
    if (!guild.welcome.enabled) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Le système de bienvenue n\'est pas configuré.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const welcomeChannel = interaction.guild.channels.cache.get(guild.welcome.channelId);
    if (!welcomeChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Le salon de bienvenue n\'existe plus.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const formattedMessage = formatMessage(guild.welcome.message, interaction.member, interaction.guild);
    
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Message de bienvenue test')
        .setDescription(formattedMessage)
        .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
    
    const confirmEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Test envoyé')
        .setDescription('Le message de bienvenue a été envoyé dans le salon configuré.')
        .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
}

function formatMessage(message, member, guild) {
    return message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount);
}
